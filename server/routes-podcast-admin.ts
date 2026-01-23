import type { Express, Request, Response } from 'express';
import { db } from './db';
import { podcastRequests, podcastDatabase, users } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import { requireAdminRole } from './middleware/adminAuth';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export function registerPodcastAdminRoutes(app: Express) {
    console.log('🎧 [INIT] Registrazione routes Podcast Admin...');

    // ==========================================
    // GET ALL PODCAST REQUESTS (Admin)
    // ==========================================
    app.get('/api/admin/podcast/requests', requireAdminRole, async (req: Request, res: Response) => {
        try {
            const { status } = req.query;

            let query = db.select({
                id: podcastRequests.id,
                userId: podcastRequests.userId,
                concorsoId: podcastRequests.concorsoId,
                materia: podcastRequests.materia,
                argomento: podcastRequests.argomento,
                descrizione: podcastRequests.descrizione,
                status: podcastRequests.status,
                priorita: podcastRequests.priorita,
                podcastId: podcastRequests.podcastId,
                noteStaff: podcastRequests.noteStaff,
                createdAt: podcastRequests.createdAt,
                completedAt: podcastRequests.completedAt,
            }).from(podcastRequests).$dynamic();

            if (status && status !== 'all') {
                query = query.where(eq(podcastRequests.status, status as string));
            }

            const requests = await query.orderBy(desc(podcastRequests.createdAt));

            console.log(`📥 GET /api/admin/podcast/requests - Found ${requests.length}`);
            res.json(requests);
        } catch (error) {
            console.error('❌ Errore GET podcast requests:', error);
            res.status(500).json({ error: 'Errore caricamento richieste' });
        }
    });

    // ==========================================
    // UPDATE REQUEST STATUS (Admin)
    // ==========================================
    app.patch('/api/admin/podcast/requests/:id', requireAdminRole, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status, noteStaff, podcastId } = req.body;

            const updates: any = {};
            if (status) updates.status = status;
            if (noteStaff !== undefined) updates.noteStaff = noteStaff;
            if (podcastId) updates.podcastId = podcastId;

            if (status === 'completed') {
                updates.completedAt = new Date();
            }

            const [updated] = await db.update(podcastRequests)
                .set(updates)
                .where(eq(podcastRequests.id, id))
                .returning();

            console.log(`✅ PATCH /api/admin/podcast/requests/${id} - Updated`);
            res.json(updated);
        } catch (error) {
            console.error('❌ Errore PATCH podcast request:', error);
            res.status(500).json({ error: 'Errore aggiornamento richiesta' });
        }
    });

    // ==========================================
    // GET ALL PODCASTS (Admin view with full data)
    // ==========================================
    app.get('/api/admin/podcast/library', requireAdminRole, async (req: Request, res: Response) => {
        try {
            const podcasts = await db.select().from(podcastDatabase).orderBy(desc(podcastDatabase.createdAt));
            console.log(`📥 GET /api/admin/podcast/library - Found ${podcasts.length}`);
            res.json(podcasts);
        } catch (error) {
            console.error('❌ Errore GET podcast library:', error);
            res.status(500).json({ error: 'Errore caricamento libreria' });
        }
    });

    // ==========================================
    // DELETE PODCAST (Admin)
    // ==========================================
    app.delete('/api/admin/podcast/:id', requireAdminRole, async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await db.delete(podcastDatabase).where(eq(podcastDatabase.id, id));
            console.log(`🗑️ DELETE /api/admin/podcast/${id}`);
            res.json({ success: true });
        } catch (error) {
            console.error('❌ Errore DELETE podcast:', error);
            res.status(500).json({ error: 'Errore eliminazione podcast' });
        }
    });

    console.log('✅ Routes Podcast Admin registrate');
}
