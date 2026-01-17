import { Router } from 'express';
import { db } from './db';
import { podcastDatabase, podcastRequests, staffMembers } from '@shared/schema-sq3r';
import { userSubscriptions } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { isAdmin, isStaff } from './utils/auth-helpers';
import multer from 'multer';

const router = Router();

// Middleware per verificare admin
function requireAdmin(req: any, res: any, next: any) {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const userEmail = user.email || 'dev@trae-ai.com';

  if (!isAdmin(userEmail)) {
    console.log(`🚫 Accesso negato per ${userEmail} (richiede ADMIN)`);
    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Solo gli amministratori possono accedere a questa risorsa'
    });
  }

  console.log(`✅ Accesso ADMIN consentito per ${userEmail}`);
  next();
}

// Middleware per verificare staff
function requireStaff(req: any, res: any, next: any) {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const userEmail = user.email || 'dev@trae-ai.com';

  if (!isStaff(userEmail) && !isAdmin(userEmail)) {
    console.log(`🚫 Accesso negato per ${userEmail} (richiede STAFF o ADMIN)`);
    return res.status(403).json({
      error: 'Accesso negato',
      message: 'Solo lo staff può accedere a questa risorsa'
    });
  }

  console.log(`✅ Accesso STAFF consentito per ${userEmail}`);
  next();
}

// Multer per upload audio (max 100MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Totali
    const [
      totalPodcasts,
      totalRequests,
      pendingRequests,
      totalUsers,
      premiumUsers,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(podcastDatabase),
      db.select({ count: sql<number>`count(*)` }).from(podcastRequests),
      db.select({ count: sql<number>`count(*)` }).from(podcastRequests).where(eq(podcastRequests.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(userSubscriptions),
      db.select({ count: sql<number>`count(*)` }).from(userSubscriptions).where(sql`tier IN ('premium', 'enterprise')`),
    ]);

    res.json({
      podcasts: {
        total: Number(totalPodcasts[0]?.count || 0),
      },
      requests: {
        total: Number(totalRequests[0]?.count || 0),
        pending: Number(pendingRequests[0]?.count || 0),
      },
      users: {
        total: Number(totalUsers[0]?.count || 0),
        premium: Number(premiumUsers[0]?.count || 0),
        free: Number(totalUsers[0]?.count || 0) - Number(premiumUsers[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('❌ Errore recupero stats:', error);
    res.status(500).json({ error: 'Errore recupero statistiche' });
  }
});

// ============================================
// PODCAST MANAGEMENT
// ============================================

// Lista tutti i podcast (staff)
router.get('/podcast', requireStaff, async (req, res) => {
  try {
    const podcasts = await db
      .select()
      .from(podcastDatabase)
      .orderBy(desc(podcastDatabase.createdAt));

    res.json(podcasts);
  } catch (error: any) {
    console.error('❌ Errore recupero podcast admin:', error);
    res.status(500).json({ error: 'Errore recupero podcast' });
  }
});

// Upload nuovo podcast
router.post('/podcast/upload', requireStaff, upload.single('audio'), async (req, res) => {
  try {
    const user = req.user as any;
    const audioFile = req.file;
    const { 
      titolo, 
      descrizione, 
      materia, 
      argomento, 
      durata, 
      trascrizione, 
      isPremiumOnly, 
      requestId  // NUOVO: ID della richiesta (opzionale)
    } = req.body;

    if (!audioFile) {
      return res.status(400).json({ error: 'File audio mancante' });
    }

    if (!titolo || !materia) {
      return res.status(400).json({ error: 'Titolo e materia sono obbligatori' });
    }

    // Converti audio in base64 (oppure salva su storage cloud)
    const audioBase64 = audioFile.buffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Crea podcast
    const [podcast] = await db.insert(podcastDatabase).values({
      titolo,
      descrizione: descrizione || '',
      materia,
      argomento: argomento || '',
      audioUrl,
      audioFileName: audioFile.originalname,
      audioFileSize: audioFile.size,
      durata: parseInt(durata) || 0,
      trascrizione: trascrizione || '',
      uploadedBy: user!.id,
      isPublic: true,
      isPremiumOnly: isPremiumOnly === 'true' || isPremiumOnly === true,
    }).returning();

    console.log(`✅ Podcast caricato dall'admin: ${podcast.titolo}`);

    // NUOVO: Se c'è una richiesta collegata, aggiornala automaticamente
    if (requestId) {
      try {
        const [updatedRequest] = await db
          .update(podcastRequests)
          .set({
            status: 'completed',
            podcastId: podcast.id,
            noteStaff: `Podcast caricato: ${podcast.titolo}`,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(podcastRequests.id, requestId))
          .returning();

        if (updatedRequest) {
          console.log(`✅ Richiesta ${requestId} collegata al podcast ${podcast.id}`);
        }
      } catch (requestError) {
        console.error('❌ Errore collegamento richiesta:', requestError);
        // Non bloccare l'upload se il collegamento fallisce
      }
    }

    res.json(podcast);
  } catch (error: any) {
    console.error('❌ Errore upload podcast:', error);
    res.status(500).json({ error: 'Errore upload podcast' });
  }
});

// Elimina podcast
router.delete('/podcast/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(podcastDatabase)
      .where(eq(podcastDatabase.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Podcast non trovato' });
    }

    console.log(`✅ Podcast eliminato: ${deleted[0].titolo}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore eliminazione podcast:', error);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

// ============================================
// RICHIESTE PODCAST UTENTI
// ============================================

// Lista tutte le richieste
router.get('/requests', requireStaff, async (req, res) => {
  try {
    const { status } = req.query;

    let query = db.select().from(podcastRequests);

    if (status && status !== 'all') {
      query = query.where(eq(podcastRequests.status, status as string)) as any;
    }

    const requests = await query.orderBy(desc(podcastRequests.createdAt));

    res.json(requests);
  } catch (error: any) {
    console.error('❌ Errore recupero richieste:', error);
    res.status(500).json({ error: 'Errore recupero richieste' });
  }
});

// Aggiorna stato richiesta
router.patch('/requests/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, noteStaff, priorita, podcastId } = req.body;

    const [updated] = await db
      .update(podcastRequests)
      .set({
        status,
        noteStaff: noteStaff || undefined,
        priorita: priorita || undefined,
        podcastId: podcastId || undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(podcastRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    console.log(`✅ Richiesta aggiornata: ${updated.id} → ${status}`);
    res.json(updated);
  } catch (error: any) {
    console.error('❌ Errore aggiornamento richiesta:', error);
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

// Elimina richiesta
router.delete('/requests/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Gestione Bulk Delete (se id è 'bulk')
    if (id === 'bulk') {
      const { status } = req.body; // Es: { status: 'completed' }
      
      if (!status) {
        return res.status(400).json({ error: 'Stato mancante per eliminazione bulk' });
      }

      const deleted = await db
        .delete(podcastRequests)
        .where(eq(podcastRequests.status, status))
        .returning();

      console.log(`✅ Bulk Delete: eliminate ${deleted.length} richieste con stato ${status}`);
      return res.json({ success: true, count: deleted.length });
    }

    // Eliminazione Singola
    const deleted = await db
      .delete(podcastRequests)
      .where(eq(podcastRequests.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    console.log(`✅ Richiesta eliminata: ${deleted[0].id} (${deleted[0].argomento})`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore eliminazione richiesta:', error);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

// ============================================
// STAFF MANAGEMENT
// ============================================

// Lista staff members
router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const staff = await db
      .select()
      .from(staffMembers)
      .orderBy(desc(staffMembers.createdAt));

    res.json(staff);
  } catch (error: any) {
    console.error('❌ Errore recupero staff:', error);
    res.status(500).json({ error: 'Errore recupero staff' });
  }
});

// Aggiungi staff member
router.post('/staff', requireAdmin, async (req, res) => {
  try {
    const { email, nome, ruolo, permessi } = req.body;

    if (!email || !nome) {
      return res.status(400).json({ error: 'Email e nome sono obbligatori' });
    }

    // Verifica se esiste già
    const existing = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email già registrata nello staff' });
    }

    // Crea staff member
    const [staff] = await db.insert(staffMembers).values({
      userId: `staff-${Date.now()}`, // Generato temporaneo
      email,
      nome,
      ruolo: ruolo || 'staff',
      permessi: permessi || {
        canUploadPodcast: false,
        canManageRequests: false,
        canManageUsers: false,
        canManageStaff: false,
      },
      isActive: true,
    }).returning();

    console.log(`✅ Staff member aggiunto: ${staff.email}`);
    res.json(staff);
  } catch (error: any) {
    console.error('❌ Errore aggiunta staff:', error);
    res.status(500).json({ error: 'Errore aggiunta staff' });
  }
});

// Rimuovi staff member
router.delete('/staff/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(staffMembers)
      .where(eq(staffMembers.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Staff member non trovato' });
    }

    console.log(`✅ Staff member rimosso: ${deleted[0].email}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore rimozione staff:', error);
    res.status(500).json({ error: 'Errore rimozione' });
  }
});

export function registerAdminRoutes(app: any) {
  app.use('/api/admin', router);
  console.log('✅ Admin Routes registrate');
}
