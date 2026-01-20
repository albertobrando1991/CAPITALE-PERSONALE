
import { createClient } from "@supabase/supabase-js";
import { eq, like } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fontiStudio } from "../shared/schema-sq3r";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function migrateFontiBase64() {
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

    console.log("Starting fonti Base64 migration...");

    const allFonti = await db.select().from(fontiStudio);
    const base64Fonti = allFonti.filter(f => f.fileUrl && f.fileUrl.startsWith('data:'));

    console.log(`Found ${base64Fonti.length} fonti with Base64 content.`);

    let successCount = 0;
    let errorCount = 0;

    for (const fonte of base64Fonti) {
        console.log(`Migrating fonte ID: ${fonte.id}`);

        try {
            // Extract base64
            // Format: data:application/pdf;base64,.....
            const base64Data = fonte.fileUrl!.split(',')[1];
            if (!base64Data) {
                console.warn(`Invalid base64 format for ${fonte.id}`);
                continue;
            }

            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `fonte-${fonte.id}.pdf`;

            // Upload to Supabase
            const { data, error } = await supabase.storage
                .from(BUCKET)
                .upload(filename, buffer, {
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
            await db.update(fontiStudio)
                .set({ fileUrl: publicUrl })
                .where(eq(fontiStudio.id, fonte.id));

            console.log(`[SUCCESS] Migrated to ${publicUrl}`);
            successCount++;

        } catch (err: any) {
            console.error(`[ERROR] Unexpected error for ${fonte.id}:`, err.message);
            errorCount++;
        }
    }

    console.log("------------------------------------------------");
    console.log("Migration Complete");
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    process.exit(0);
}

migrateFontiBase64().catch(err => {
    console.error("Script failed:", err);
    process.exit(1);
});
