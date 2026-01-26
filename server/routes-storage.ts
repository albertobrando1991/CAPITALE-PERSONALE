/**
 * Storage Routes - API endpoints for direct file uploads to Supabase
 * 
 * These endpoints allow the frontend to:
 * 1. Request a signed URL for direct upload
 * 2. Confirm upload completion (to save metadata in DB)
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import {
    createSignedUploadUrl,
    createSignedDownloadUrl,
    isSupabaseStorageConfigured,
    BUCKETS
} from "./services/supabase-storage";
import { z } from "zod";

const router = Router();

// Validation schemas
const signedUploadUrlSchema = z.object({
    filename: z.string().min(1, "Filename is required"),
    contentType: z.string().min(1, "Content type is required"),
    bucket: z.enum(["materials", "bandi-pdf"]).default("materials"),
    // Optional: for organizing files by concorso
    concorsoId: z.string().uuid().optional(),
});

/**
 * POST /api/storage/signed-upload-url
 * 
 * Returns a signed URL for direct upload to Supabase Storage.
 * The client should then PUT the file directly to this URL.
 */
router.post("/signed-upload-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
        // Check if storage is configured
        if (!isSupabaseStorageConfigured()) {
            return res.status(503).json({
                error: "Storage non configurato",
                details: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY non impostati"
            });
        }

        // Validate input
        const parsed = signedUploadUrlSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Dati non validi",
                details: parsed.error.errors
            });
        }

        const { filename, contentType, bucket, concorsoId } = parsed.data;
        const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;

        if (!userId) {
            return res.status(401).json({ error: "Utente non autenticato" });
        }

        // Sanitize filename
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const timestamp = Date.now();

        // Build path: users/{userId}/{concorsoId?}/{timestamp}_{filename}
        let path: string;
        if (concorsoId) {
            path = `users/${userId}/${concorsoId}/${timestamp}_${sanitizedFilename}`;
        } else {
            path = `users/${userId}/${timestamp}_${sanitizedFilename}`;
        }

        // Get the bucket name
        const bucketName = bucket === "bandi-pdf" ? BUCKETS.BANDI_PDF : BUCKETS.MATERIALS;

        // Generate signed URL
        const result = await createSignedUploadUrl(bucketName, path);

        res.json({
            success: true,
            signedUrl: result.signedUrl,
            token: result.token,
            path: result.path,
            // Client will need these to complete the upload
            bucket: bucketName,
            contentType,
        });

    } catch (error: any) {
        console.error("[Storage] Error generating signed URL:", error);
        res.status(500).json({
            error: "Errore nella generazione URL",
            details: error.message
        });
    }
});

/**
 * POST /api/storage/signed-download-url
 * 
 * Returns a signed URL for downloading/viewing a private file.
 */
router.post("/signed-download-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
        if (!isSupabaseStorageConfigured()) {
            return res.status(503).json({ error: "Storage non configurato" });
        }

        const { path, bucket = "materials", expiresIn = 3600 } = req.body;

        console.log(`[STORAGE] Requesting signed URL for path: "${path}" in bucket: "${bucket}"`);

        if (!path) {
            console.error("[STORAGE] Path missing in request body");
            return res.status(400).json({ error: "Path richiesto" });
        }

        const bucketName = bucket === "bandi-pdf" ? BUCKETS.BANDI_PDF : BUCKETS.MATERIALS;
        const signedUrl = await createSignedDownloadUrl(bucketName, path, expiresIn);

        res.json({
            success: true,
            signedUrl,
            expiresIn,
        });

    } catch (error: any) {
        console.error("[Storage] Error generating download URL:", error);
        res.status(500).json({ error: "Errore nella generazione URL", details: error.message });
    }
});

/**
 * GET /api/storage/status
 * 
 * Check if Supabase Storage is configured.
 */
router.get("/status", (req: Request, res: Response) => {
    res.json({
        configured: isSupabaseStorageConfigured(),
        buckets: Object.values(BUCKETS),
    });
});

export function registerStorageRoutes(app: any) {
    app.use("/api/storage", router);
    console.log("✅ Storage routes registered");
}
