import type { Express } from 'express';
import { db } from './db';
import { podcastDatabase, podcastRequests, podcastListens, userSubscriptions } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export function registerPodcastRoutes(app: Express) {
  console.log('🎧 [INIT] Registrazione routes Podcast...');

  // ==========================================
  // BANCA DATI PODCAST (Pubblici)
  // ==========================================

  // GET - Lista podcast (filtro per materia)
  app.get('/api/podcast', async (req, res) => {
    try {
      console.log('📥 GET /api/podcast');
      const { materia } = req.query;

      // Verifica se utente è premium
      const isPremium = await checkPremiumStatus(req.user?.id, req.user?.email);

      let query = db.select({
        id: podcastDatabase.id,
        titolo: podcastDatabase.titolo,
        descrizione: podcastDatabase.descrizione,
        materia: podcastDatabase.materia,
        argomento: podcastDatabase.argomento,
        audioFileName: podcastDatabase.audioFileName,
        audioFileSize: podcastDatabase.audioFileSize,
        durata: podcastDatabase.durata,
        ascoltiTotali: podcastDatabase.ascoltiTotali,
        isPremiumOnly: podcastDatabase.isPremiumOnly,
        createdAt: podcastDatabase.createdAt,
      }).from(podcastDatabase);

      if (materia) {
        console.log(`  🔍 Filtro materia: ${materia}`);
        query = query.where(eq(podcastDatabase.materia, materia as string));
      }

      let podcasts = await query.orderBy(desc(podcastDatabase.ascoltiTotali));

      // Nascondi URL audio se non premium
      podcasts = podcasts.map(p => ({
        ...p,
        locked: p.isPremiumOnly && !isPremium,
      }));

      console.log(`  ✅ Trovati ${podcasts.length} podcast`);
      res.json(podcasts);
    } catch (error) {
      console.error('❌ Errore caricamento podcast:', error);
      res.status(500).json({ error: 'Errore caricamento podcast' });
    }
  });

  // GET - Dettaglio podcast con audio URL (solo premium)
  app.get('/api/podcast/:id', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const isPremium = await checkPremiumStatus(req.user.id, req.user.email);

      const [podcast] = await db.select()
        .from(podcastDatabase)
        .where(eq(podcastDatabase.id, req.params.id));

      if (!podcast) {
        return res.status(404).json({ error: 'Podcast non trovato' });
      }

      // Blocca se premium-only e utente non premium
      if (podcast.isPremiumOnly && !isPremium) {
        return res.status(403).json({
          error: 'Podcast disponibile solo per utenti Premium',
          locked: true,
        });
      }

      // Incrementa ascolti
      await db.update(podcastDatabase)
        .set({ ascoltiTotali: podcast.ascoltiTotali + 1 })
        .where(eq(podcastDatabase.id, req.params.id));

      // Log ascolto
      await db.insert(podcastListens).values({
        podcastId: req.params.id,
        userId: req.user.id,
        progressoSecondi: 0,
        completato: false,
      });

      res.json(podcast);
    } catch (error) {
      console.error('❌ Errore recupero podcast:', error);
      res.status(500).json({ error: 'Errore recupero podcast' });
    }
  });

  // POST - Aggiorna progresso ascolto
  app.post('/api/podcast/:id/progress', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { progressoSecondi, completato } = req.body;

      await db.update(podcastListens)
        .set({
          progressoSecondi,
          completato: completato || false,
        })
        .where(and(
          eq(podcastListens.podcastId, req.params.id),
          eq(podcastListens.userId, req.user.id)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Errore aggiornamento progresso:', error);
      res.status(500).json({ error: 'Errore aggiornamento' });
    }
  });

  // ==========================================
  // RICHIESTE PODCAST CUSTOM (Premium)
  // ==========================================

  // POST - Richiedi podcast custom
  app.post('/api/podcast/request', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const isPremium = await checkPremiumStatus(req.user.id, req.user.email);
      if (!isPremium) {
        return res.status(403).json({ error: 'Funzione disponibile solo per utenti Premium' });
      }

      const { concorsoId, materia, argomento, descrizione } = req.body;

      const [richiesta] = await db.insert(podcastRequests).values({
        userId: req.user.id,
        concorsoId,
        materia,
        argomento,
        descrizione,
        status: 'pending',
        priorita: 'normale',
      }).returning();

      console.log('✅ Richiesta podcast creata:', richiesta.id);
      res.json(richiesta);
    } catch (error) {
      console.error('❌ Errore creazione richiesta:', error);
      res.status(500).json({ error: 'Errore creazione richiesta' });
    }
  });

  // GET - Lista richieste utente
  app.get('/api/podcast/my-requests', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const richieste = await db.select()
        .from(podcastRequests)
        .where(eq(podcastRequests.userId, req.user.id))
        .orderBy(desc(podcastRequests.createdAt));

      res.json(richieste);
    } catch (error) {
      console.error('❌ Errore recupero richieste:', error);
      res.status(500).json({ error: 'Errore recupero richieste' });
    }
  });

  // ==========================================
  // UPLOAD PODCAST (Solo Staff)
  // ==========================================

  // POST - Upload nuovo podcast (staff only)
  app.post('/api/podcast/upload', upload.single('audio'), async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      // TODO: Verifica ruolo staff
      // if (req.user.ruolo !== 'staff') return res.status(403)...

      const { titolo, descrizione, materia, argomento, durata } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'File audio obbligatorio' });
      }

      // Converti in base64 (o salva su storage cloud)
      const audioBase64 = file.buffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

      const [podcast] = await db.insert(podcastDatabase).values({
        titolo,
        descrizione,
        materia,
        argomento,
        audioUrl,
        audioFileName: file.originalname,
        audioFileSize: file.size,
        durata: parseInt(durata),
        uploadedBy: req.user.id,
        isPublic: true,
        isPremiumOnly: true,
      }).returning();

      console.log('✅ Podcast caricato:', podcast.id);
      res.json(podcast);
    } catch (error) {
      console.error('❌ Errore upload podcast:', error);
      res.status(500).json({ error: 'Errore upload' });
    }
  });

  console.log('✅ Routes Podcast registrate');
}

import { isAlwaysPremium } from './utils/auth-helpers';

// Helper: Verifica status premium (con override admin)
async function checkPremiumStatus(userId?: string, userEmail?: string): Promise<boolean> {
  if (!userId) return false;

  // 🔥 ADMIN SEMPRE PREMIUM
  if (isAlwaysPremium(userEmail)) {
    console.log(`👑 Admin ${userEmail} → Premium bypass`);
    return true;
  }

  try {
    const [subscription] = await db.select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    if (!subscription) {
      // Crea subscription free di default
      await db.insert(userSubscriptions).values({
        userId,
        tier: 'free',
        status: 'active',
      });
      return false;
    }

    return subscription.tier === 'premium' || subscription.tier === 'enterprise';
  } catch (error) {
    console.error('❌ Errore verifica premium:', error);
    return false;
  }
}
