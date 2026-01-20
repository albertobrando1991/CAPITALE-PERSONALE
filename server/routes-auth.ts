
import { Router } from 'express';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users, userRoles, userSubscriptions } from '../shared/schema';
import { getSupabaseAdmin, isSupabaseAuthConfigured } from './services/supabase-auth';

const router = Router();

// DELETE /api/auth/delete - Delete own account
router.delete('/delete', async (req, res) => {
    try {
        const user = req.user as any;
        const userId = user?.id || user?.claims?.sub;
        const supabaseAuthId = user?.supabaseAuthId || user?.claims?.sub; // Usually same

        console.log(`[AUTH] Request to delete account: ${userId}`);

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // 1. Delete from Supabase Auth (if linked)
        if (isSupabaseAuthConfigured() && supabaseAuthId) {
            const admin = getSupabaseAdmin();
            if (admin) {
                // Warning: This deletes the user from Supabase Auth immediately.
                const { error } = await admin.auth.admin.deleteUser(supabaseAuthId);
                if (error) {
                    console.error(`[AUTH] Failed to delete Supabase user ${supabaseAuthId}:`, error);
                    // We continue to delete local data even if Supabase fails (or user might be stuck)
                } else {
                    console.log(`[AUTH] Deleted Supabase user ${supabaseAuthId}`);
                }
            }
        }

        // 2. Delete from Local Database (cascade manually if needed, or rely on FK constraint if set)
        // We'll manually delete related records to be safe/explicit
        await db.delete(userRoles).where(eq(userRoles.userId, userId));
        await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));

        // Finally delete content (optional) or just the user record
        // Ideally we might want to keep content but anonymize it? 
        // User requested "direct deletion", so we wipe the user record.
        await db.delete(users).where(eq(users.id, userId));

        console.log(`[AUTH] Deleted local user ${userId}`);

        // 3. Clear session
        if (req.logout) {
            req.logout(() => { });
        }
        req.session?.destroy(() => { });

        res.json({ success: true, message: 'Account deleted successfully' });

    } catch (error: any) {
        console.error('[AUTH] Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

export const authRoutes = router;
