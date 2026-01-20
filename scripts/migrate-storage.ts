
import { createClient } from "@supabase/supabase-js";
import { eq, like } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { materials } from "../shared/schema";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function migrateStorage() {
    // Import db dynamically
    const { db } = await import("../server/db");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const BUCKET = "materials";

    console.log("Starting storage migration...");

    // Find all materials with local paths
    // Note: Drizzle LIKE is case sensitive usually, but paths are lowercase mostly.
    // We look for anything starting with /uploads/
    // We fetch all and filter in JS to be safe if like() has issues or if paths vary
    const allMaterials = await db.select().from(materials);
    const localMaterials = allMaterials.filter(m => m.fileUrl && m.fileUrl.startsWith("/uploads/materials/"));

    console.log(`Found ${localMaterials.length} materials with local paths.`);

    let successCount = 0;
    let errorCount = 0;
    let missingFileCount = 0;

    for (const material of localMaterials) {
        // fileUrl is like /uploads/materials/filename.pdf
        const filename = path.basename(material.fileUrl!);
        const localPath = path.resolve(__dirname, "../uploads/materials", filename);

        console.log(`Migrating: ${filename} (ID: ${material.id})`);

        if (!fs.existsSync(localPath)) {
            console.warn(`[WARNING] Local file not found: ${localPath}`);
            missingFileCount++;
            continue;
        }

        try {
            const fileBuffer = fs.readFileSync(localPath);

            // Upload to Supabase
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .upload(filename, fileBuffer, {
                    contentType: "application/pdf",
                    upsert: true
                });

            if (error) {
                console.error(`[ERROR] Supabase upload failed for ${filename}:`, error.message);
                errorCount++;
                continue;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(filename);

            // Update DB
            await db.update(materials)
                .set({ fileUrl: publicUrl })
                .where(eq(materials.id, material.id));

            console.log(`[SUCCESS] Migrated to ${publicUrl}`);
            successCount++;

        } catch (err: any) {
            console.error(`[ERROR] Unexpected error for ${filename}:`, err.message);
            errorCount++;
        }
    }

    console.log("------------------------------------------------");
    console.log("Migration Complete");
    console.log(`Success: ${successCount}`);
    console.log(`Missing Files: ${missingFileCount}`);
    console.log(`Errors: ${errorCount}`);

    process.exit(0);
}

migrateStorage().catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
