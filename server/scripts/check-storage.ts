
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log("Checking Supabase Storage...");
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
        return;
    }
    console.log("Buckets found:", buckets.map(b => b.name));

    const materials = buckets.find(b => b.name === "materials");
    if (!materials) {
        console.error("CRITICAL: 'materials' bucket NOT found!");
    } else {
        console.log("'materials' bucket exists.");

        // Test Upload
        const testFile = Buffer.from("Test content for signed url");
        const testPath = `users/test-user/${Date.now()}_test.txt`;
        console.log("Uploading test file to:", testPath);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("materials")
            .upload(testPath, testFile, { upsert: true });

        if (uploadError) {
            console.error("Upload failed:", uploadError);
            return;
        }
        console.log("Upload success. Path:", uploadData.path);

        // Test Signed URL
        const { data: urlData, error: urlError } = await supabase.storage
            .from("materials")
            .createSignedUrl(uploadData.path, 3600);

        if (urlError) {
            console.error("Signed URL generation failed:", urlError);
            return;
        }
        console.log("Generated Signed URL:", urlData.signedUrl);
        console.log("Please try opening this URL in browser to verify.");
        // List files
        const { data: files } = await supabase.storage.from("materials").list("users", { limit: 10 });
        console.log("Files in 'users' folder:", files);
    }
}

check();
