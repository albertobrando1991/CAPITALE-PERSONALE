import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase Storage Service for handling file uploads
// Buckets:
// - "bandi-pdf" - stores official concorsi bando PDFs (admin only)
// - "materials" - stores user-uploaded study materials (per-user)

export const BUCKETS = {
  BANDI_PDF: "bandi-pdf",
  MATERIALS: "materials",
} as const;

type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

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
 * Ensures a bucket exists with the specified configuration
 */
export async function ensureBucketExists(
  bucketName: BucketName = BUCKETS.BANDI_PDF,
  options?: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] }
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError);
    throw new Error("Failed to list storage buckets");
  }

  const bucketExists = buckets?.some((b) => b.name === bucketName);

  if (!bucketExists) {
    const defaultOptions = {
      public: bucketName === BUCKETS.BANDI_PDF, // bandi are public, materials are private
      fileSizeLimit: 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes: bucketName === BUCKETS.BANDI_PDF
        ? ["application/pdf"]
        : ["application/pdf", "video/mp4", "audio/mpeg", "audio/mp3"],
    };

    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      ...defaultOptions,
      ...options,
    });

    if (createError) {
      console.error("Error creating bucket:", createError);
      throw new Error("Failed to create storage bucket");
    }

    console.log(`Created Supabase Storage bucket: ${bucketName}`);
  }
}

// ============================================================
// SIGNED URL FUNCTIONS (for direct browser uploads)
// ============================================================

/**
 * Generate a signed URL for direct upload from the browser
 * This allows clients to upload directly to Supabase without going through our server.
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket (e.g., 'user-123/materials/document.pdf')
 * @returns Signed URL and token, valid for 60 seconds
 */
export async function createSignedUploadUrl(
  bucket: BucketName,
  path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("[Supabase] Error creating signed upload URL:", error.message);
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

/**
 * Generate a signed URL for downloading/viewing a private file
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 */
export async function createSignedDownloadUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("[Supabase] Error creating signed download URL:", error.message);
    throw new Error(`Failed to create signed download URL: ${error.message}`);
  }

  return data.signedUrl;
}

// ============================================================
// BANDI PDF FUNCTIONS (existing functionality)
// ============================================================

/**
 * Upload a PDF file to Supabase Storage (bandi-pdf bucket)
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
    .from(BUCKETS.BANDI_PDF)
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading PDF:", error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKETS.BANDI_PDF).getPublicUrl(data.path);

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
  const urlParts = publicUrl.split(`/storage/v1/object/public/${BUCKETS.BANDI_PDF}/`);
  if (urlParts.length !== 2) {
    throw new Error("Invalid file URL format");
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage.from(BUCKETS.BANDI_PDF).remove([filePath]);

  if (error) {
    console.error("Error deleting PDF:", error);
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}

// ============================================================
// MATERIALS FUNCTIONS (user study materials)
// ============================================================

/**
 * Upload a material file to Supabase Storage (materials bucket)
 * @param buffer - File buffer
 * @param filename - Original filename
 * @param userId - User ID who owns the file
 * @param concorsoId - Concorso ID (optional)
 * @returns Storage path (not URL) of the uploaded file
 */
export async function uploadMaterialFile(
  buffer: Buffer,
  filename: string,
  userId: string,
  concorsoId?: string
): Promise<string> {
  const supabase = getSupabaseClient();

  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();

  // Create path: users/{userId}/{concorsoId?}/{timestamp}_{filename}
  let filePath: string;
  if (concorsoId) {
    filePath = `users/${userId}/${concorsoId}/${timestamp}_${sanitizedFilename}`;
  } else {
    filePath = `users/${userId}/${timestamp}_${sanitizedFilename}`;
  }

  const { data, error } = await supabase.storage
    .from(BUCKETS.MATERIALS)
    .upload(filePath, buffer, {
      contentType: "application/pdf", // Default, allows overwriting in arguments if needed
      upsert: false,
    });

  if (error) {
    console.error("Error uploading material:", error);
    throw new Error(`Failed to upload material: ${error.message}`);
  }

  return data.path;
}

/**
 * Get public URL for a file in a public bucket
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete files from storage
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths to delete
 */
export async function deleteFiles(bucket: BucketName, paths: string[]): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    console.error("[Supabase] Error deleting files:", error.message);
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}

/**
 * Check if Supabase Storage is configured
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

