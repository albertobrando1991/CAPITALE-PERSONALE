
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { materials } from "../shared/schema";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkMaterials() {
    // Import db dynamically after env vars are loaded
    const { db } = await import("../server/db");

    console.log("Checking materials table...");
    const allMaterials = await db.select().from(materials);
    console.log(`Found ${allMaterials.length} materials.`);

    // Sample some fileUrls
    if (allMaterials.length > 0) {
        console.log("Sample fileUrls:");
        allMaterials.slice(0, 5).forEach(m => console.log(`- ${m.id}: ${m.fileUrl}`));
    }
    process.exit(0);
}

checkMaterials().catch((err) => {
    console.error(err);
    process.exit(1);
});
