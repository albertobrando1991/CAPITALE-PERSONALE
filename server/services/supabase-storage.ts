import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase Storage Service for handling PDF uploads
// Bucket: "bandi-pdf" - stores official concorsi bando PDFs

const BUCKET_NAME = "bandi-pdf";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

/**
 * Ensures the bandi-pdf bucket exists with public access
 */
export async function ensureBucketExists(): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError);
    throw new Error("Failed to list storage buckets");
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // PDFs should be publicly accessible
      fileSizeLimit: 50 * 1024 * 1024, // 50MB max
      allowedMimeTypes: ["application/pdf"],
    });

    if (createError) {
      console.error("Error creating bucket:", createError);
      throw new Error("Failed to create storage bucket");
    }

    console.log(`Created Supabase Storage bucket: ${BUCKET_NAME}`);
  }
}

/**
 * Upload a PDF file to Supabase Storage
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param concorsoId - Official concorso ID for organizing files
 * @returns Public URL to the uploaded file
 */
export async function uploadBandoPdf(
  buffer: Buffer,
  filename: string,
  concorsoId: string
): Promise<string> {
  const supabase = getSupabaseClient();

  // Sanitize filename and create path
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filePath = `${concorsoId}/${timestamp}_${sanitizedFilename}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading PDF:", error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete a PDF file from Supabase Storage
 * @param publicUrl - The public URL of the file to delete
 */
export async function deleteBandoPdf(publicUrl: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Extract file path from URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/bandi-pdf/concorso-id/filename.pdf
  const urlParts = publicUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
  if (urlParts.length !== 2) {
    throw new Error("Invalid file URL format");
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.error("Error deleting PDF:", error);
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}

/**
 * Check if Supabase Storage is configured
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
