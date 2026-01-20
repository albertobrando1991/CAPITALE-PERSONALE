
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fontiStudio } from "../shared/schema-sq3r";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkFonti() {
    // Import db dynamically
    const { db } = await import("../server/db");

    console.log("Checking fonti_studio table...");
    const allFonti = await db.select().from(fontiStudio);
    console.log(`Found ${allFonti.length} fonti.`);

    let base64Count = 0;

    // Sample some fileUrls
    if (allFonti.length > 0) {
        console.log("Sample fileUrls:");
        for (const f of allFonti) {
            const isBase64 = f.fileUrl && f.fileUrl.startsWith('data:');
            const isLocal = f.fileUrl && f.fileUrl.startsWith('/uploads');

            if (isBase64) base64Count++;

            console.log(`- ${f.id}: ${isBase64 ? 'BASE64 DATA (' + f.fileUrl?.substring(0, 30) + '...)' : f.fileUrl}`);
        }
    }

    console.log(`Summary: ${base64Count} files are stored as Base64.`);
    process.exit(0);
}

checkFonti().catch((err) => {
    console.error(err);
    process.exit(1);
});
