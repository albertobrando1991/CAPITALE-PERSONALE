/**
 * useSupabaseUpload - Hook for direct uploads to Supabase Storage
 * 
 * This hook allows uploading files directly to Supabase Storage,
 * bypassing the server for improved performance and to avoid timeouts.
 * 
 * Flow:
 * 1. Request signed URL from backend
 * 2. PUT file directly to Supabase
 * 3. Return the file path for saving to DB
 */

import { useState, useCallback } from 'react';

interface UploadOptions {
    bucket?: 'materials' | 'bandi-pdf';
    concorsoId?: string;
    onProgress?: (progress: number) => void;
}

interface UploadResult {
    success: boolean;
    path?: string;
    bucket?: string;
    error?: string;
}

export function useSupabaseUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(async (
        file: File,
        options: UploadOptions = {}
    ): Promise<UploadResult> => {
        const { bucket = 'materials', concorsoId, onProgress } = options;

        setIsUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Step 1: Get signed URL from backend
            const signedUrlResponse = await fetch('/api/storage/signed-upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    bucket,
                    concorsoId,
                }),
            });

            if (!signedUrlResponse.ok) {
                const data = await signedUrlResponse.json().catch(() => ({}));
                throw new Error(data.error || `Failed to get upload URL (${signedUrlResponse.status})`);
            }

            const { signedUrl, path, token } = await signedUrlResponse.json();

            setProgress(10);
            onProgress?.(10);

            // Step 2: Upload file directly to Supabase
            const uploadResponse = await fetch(signedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed (${uploadResponse.status})`);
            }

            setProgress(100);
            onProgress?.(100);

            return {
                success: true,
                path,
                bucket,
            };

        } catch (err: any) {
            const errorMessage = err?.message || 'Upload failed';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            setIsUploading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setIsUploading(false);
        setProgress(0);
        setError(null);
    }, []);

    return {
        upload,
        isUploading,
        progress,
        error,
        reset,
    };
}

/**
 * Check if Supabase Storage is available
 */
export async function checkStorageStatus(): Promise<boolean> {
    try {
        const res = await fetch('/api/storage/status', { credentials: 'include' });
        if (!res.ok) return false;
        const data = await res.json();
        return data.configured === true;
    } catch {
        return false;
    }
}
