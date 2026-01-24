import { Router, Request, Response } from 'express';
import { db } from './db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { mnemonicheNumeri, palazziMemoria, filmMentali } from '../shared/schema';
import { isAuthenticatedHybrid } from './services/supabase-auth';

const router = Router();

// ===================================================== 
// MIDDLEWARE: Authentication handled by isAuthenticatedHybrid (supports both JWT and session)
// ===================================================== 

// ===================================================== 
// 🔢 MNEMONICHE NUMERI 
// ===================================================== 

// GET /api/mnemotecniche/numeri - Lista tutte le mnemoniche dell'utente 
router.get('/numeri', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { concorsoId } = req.query;

    let query = db
      .select()
      .from(mnemonicheNumeri)
      .where(eq(mnemonicheNumeri.userId, userId))
      .orderBy(desc(mnemonicheNumeri.createdAt));

    if (concorsoId) {
      query = query.where(eq(mnemonicheNumeri.concorsoId, String(concorsoId)));
    }

    const mnemoniche = await query;
    res.json(mnemoniche);
  } catch (error) {
    console.error('❌ Errore GET /numeri:', error);
    res.status(500).json({ error: 'Errore nel recupero delle mnemoniche' });
  }
});

// POST /api/mnemotecniche/numeri - Crea nuova mnemonica numerica 
router.post('/numeri', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      numeroArticolo,
      codiceFonetico,
      parolaMnemonica,
      contesto,
      note
    } = req.body;

    // Validazione 
    if (!numeroArticolo || !codiceFonetico || !parolaMnemonica) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti: numeroArticolo, codiceFonetico, parolaMnemonica'
      });
    }

    const [nuovaMnemonica] = await db
      .insert(mnemonicheNumeri)
      .values({
        userId: userId,
        concorsoId: concorsoId || null,
        numeroArticolo: numeroArticolo,
        codiceFonetico: codiceFonetico,
        parolaMnemonica: parolaMnemonica,
        contesto: contesto || null,
        note: note || null
      })
      .returning();

    res.status(201).json(nuovaMnemonica);
  } catch (error) {
    console.error('❌ Errore POST /numeri:', error);
    res.status(500).json({ error: 'Errore nella creazione della mnemonica' });
  }
});

// DELETE /api/mnemotecniche/numeri/:id - Elimina mnemonica 
router.delete('/numeri/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await db
      .delete(mnemonicheNumeri)
      .where(and(
        eq(mnemonicheNumeri.id, Number(id)),
        eq(mnemonicheNumeri.userId, userId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Mnemonica non trovata' });
    }

    res.json({ message: 'Mnemonica eliminata', id: Number(id) });
  } catch (error) {
    console.error('❌ Errore DELETE /numeri/:id:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione' });
  }
});

// ===================================================== 
// 🏛️ PALAZZI DELLA MEMORIA 
// ===================================================== 

// GET /api/mnemotecniche/palazzi - Lista tutti i palazzi 
router.get('/palazzi', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { concorsoId } = req.query;

    let query = db
      .select()
      .from(palazziMemoria)
      .where(eq(palazziMemoria.userId, userId))
      .orderBy(desc(palazziMemoria.isPreferito), desc(palazziMemoria.createdAt));

    if (concorsoId) {
      query = query.where(eq(palazziMemoria.concorsoId, String(concorsoId)));
    }

    const palazzi = await query;
    res.json(palazzi);
  } catch (error) {
    console.error('❌ Errore GET /palazzi:', error);
    res.status(500).json({ error: 'Errore nel recupero dei palazzi' });
  }
});

// GET /api/mnemotecniche/palazzi/:id - Dettaglio singolo palazzo 
router.get('/palazzi/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const [palazzo] = await db
      .select()
      .from(palazziMemoria)
      .where(and(
        eq(palazziMemoria.id, Number(id)),
        eq(palazziMemoria.userId, userId)
      ));

    if (!palazzo) {
      return res.status(404).json({ error: 'Palazzo non trovato' });
    }

    res.json(palazzo);
  } catch (error) {
    console.error('❌ Errore GET /palazzi/:id:', error);
    res.status(500).json({ error: 'Errore nel recupero del palazzo' });
  }
});

// POST /api/mnemotecniche/palazzi - Crea nuovo palazzo 
router.post('/palazzi', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      nomePalazzo,
      descrizione,
      stanze,
      isPreferito
    } = req.body;

    // Validazione 
    if (!nomePalazzo || !Array.isArray(stanze) || stanze.length === 0) {
      return res.status(400).json({
        error: 'Campi obbligatori: nomePalazzo, stanze (array non vuoto)'
      });
    }

    // Validazione struttura stanze 
    const stanzeValide = stanze.every((s: any) => s.nome && s.articolo && s.immagine);
    if (!stanzeValide) {
      return res.status(400).json({
        error: 'Ogni stanza deve avere: nome, articolo, immagine'
      });
    }

    const [nuovoPalazzo] = await db
      .insert(palazziMemoria)
      .values({
        userId: userId,
        concorsoId: concorsoId || null,
        nomePalazzo: nomePalazzo,
        descrizione: descrizione || null,
        stanze: stanze,
        isPreferito: isPreferito || false
      })
      .returning();

    res.status(201).json(nuovoPalazzo);
  } catch (error) {
    console.error('❌ Errore POST /palazzi:', error);
    res.status(500).json({ error: 'Errore nella creazione del palazzo' });
  }
});

// PATCH /api/mnemotecniche/palazzi/:id - Aggiorna palazzo 
router.patch('/palazzi/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    // Validazione stanze se presenti 
    if (updates.stanze && !Array.isArray(updates.stanze)) {
      return res.status(400).json({ error: 'stanze deve essere un array' });
    }

    const [updated] = await db
      .update(palazziMemoria)
      .set(updates)
      .where(and(
        eq(palazziMemoria.id, Number(id)),
        eq(palazziMemoria.userId, userId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Palazzo non trovato' });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Errore PATCH /palazzi/:id:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento' });
  }
});

// DELETE /api/mnemotecniche/palazzi/:id - Elimina palazzo 
router.delete('/palazzi/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await db
      .delete(palazziMemoria)
      .where(and(
        eq(palazziMemoria.id, Number(id)),
        eq(palazziMemoria.userId, userId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Palazzo non trovato' });
    }

    res.json({ message: 'Palazzo eliminato', id: Number(id) });
  } catch (error) {
    console.error('❌ Errore DELETE /palazzi/:id:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione' });
  }
});

// ===================================================== 
// 🎬 FILM MENTALI 
// ===================================================== 

// GET /api/mnemotecniche/film - Lista tutti i film 
router.get('/film', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { concorsoId, articolo } = req.query;

    let query = db
      .select()
      .from(filmMentali)
      .where(eq(filmMentali.userId, userId))
      .orderBy(desc(filmMentali.isPreferito), desc(filmMentali.createdAt));

    if (concorsoId) {
      query = query.where(eq(filmMentali.concorsoId, String(concorsoId)));
    }

    if (articolo) {
      query = query.where(eq(filmMentali.articolo, String(articolo)));
    }

    const film = await query;
    res.json(film);
  } catch (error) {
    console.error('❌ Errore GET /film:', error);
    res.status(500).json({ error: 'Errore nel recupero dei film' });
  }
});

// GET /api/mnemotecniche/film/:id - Dettaglio singolo film 
router.get('/film/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const [film] = await db
      .select()
      .from(filmMentali)
      .where(and(
        eq(filmMentali.id, Number(id)),
        eq(filmMentali.userId, userId)
      ));

    if (!film) {
      return res.status(404).json({ error: 'Film non trovato' });
    }

    res.json(film);
  } catch (error) {
    console.error('❌ Errore GET /film/:id:', error);
    res.status(500).json({ error: 'Errore nel recupero del film' });
  }
});

// POST /api/mnemotecniche/film - Crea nuovo film 
router.post('/film', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      titolo,
      articolo,
      setting,
      soggettoAttivo,
      condotta,
      evento,
      nessoCausale,
      elementoPsicologico,
      tags,
      isPreferito
    } = req.body;

    // Validazione campi obbligatori 
    if (!titolo || !articolo || !soggettoAttivo || !condotta || !evento) {
      return res.status(400).json({
        error: 'Campi obbligatori: titolo, articolo, soggettoAttivo, condotta, evento'
      });
    }

    const [nuovoFilm] = await db
      .insert(filmMentali)
      .values({
        userId: userId,
        concorsoId: concorsoId || null,
        titolo,
        articolo,
        setting: setting || null,
        soggettoAttivo: soggettoAttivo,
        condotta,
        evento,
        nessoCausale: nessoCausale || null,
        elementoPsicologico: elementoPsicologico || null,
        tags: tags || [],
        isPreferito: isPreferito || false
      })
      .returning();

    res.status(201).json(nuovoFilm);
  } catch (error) {
    console.error('❌ Errore POST /film:', error);
    res.status(500).json({ error: 'Errore nella creazione del film' });
  }
});

// PATCH /api/mnemotecniche/film/:id - Aggiorna film 
router.patch('/film/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;

    const [updated] = await db
      .update(filmMentali)
      .set(updates)
      .where(and(
        eq(filmMentali.id, Number(id)),
        eq(filmMentali.userId, userId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Film non trovato' });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Errore PATCH /film/:id:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento' });
  }
});

// DELETE /api/mnemotecniche/film/:id - Elimina film 
router.delete('/film/:id', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await db
      .delete(filmMentali)
      .where(and(
        eq(filmMentali.id, Number(id)),
        eq(filmMentali.userId, userId)
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Film non trovato' });
    }

    res.json({ message: 'Film eliminato', id: Number(id) });
  } catch (error) {
    console.error('❌ Errore DELETE /film/:id:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione' });
  }
});

// ===================================================== 
// 📊 STATISTICHE 
// ===================================================== 

// GET /api/mnemotecniche/stats - Statistiche generali 
router.get('/stats', isAuthenticatedHybrid, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [mnemonicheCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(mnemonicheNumeri)
      .where(eq(mnemonicheNumeri.userId, userId));

    const [palazziCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(palazziMemoria)
      .where(eq(palazziMemoria.userId, userId));

    const [filmCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(filmMentali)
      .where(eq(filmMentali.userId, userId));

    res.json({
      totale_mnemoniche_numeri: mnemonicheCount.count,
      totale_palazzi: palazziCount.count,
      totale_film: filmCount.count,
      totale_tecniche: mnemonicheCount.count + palazziCount.count + filmCount.count
    });
  } catch (error) {
    console.error('❌ Errore GET /stats:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

export default router;
