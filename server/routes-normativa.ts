import { Express, Request, Response } from 'express';
import { storageNormativa } from './storage-normativa';
import { requireAdminOrStaff, getUserId } from './middleware/auth';
import { z } from 'zod';
import { tipiNormaEnum } from '../shared/schema-normativa';

// Schema validazione norma
const createNormaSchema = z.object({
  urn: z.string().min(5, 'URN troppo corta'),
  tipo: z.enum(tipiNormaEnum),
  numero: z.string().optional(),
  anno: z.number().int().min(1800).max(2100),
  data: z.string().optional(),
  titolo: z.string().min(5, 'Titolo troppo corto'),
  titoloBreve: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  urlNormattiva: z.string().url('URL non valido'),
  gazzettaUfficiale: z.string().optional(),
});

const updateNormaSchema = createNormaSchema.partial();

export function registerNormativaRoutes(app: Express) {
  console.log('📜 Registrazione routes Normativa...');

  // ========== GET RICERCA NORME (pubblico) ==========
  app.get('/api/norme/search', async (req: Request, res: Response) => {
    try {
      const { q, tipo, anno, limit } = req.query;
      
      const risultati = await storageNormativa.searchNorme({
        query: q as string,
        tipo: tipo as string,
        anno: anno ? parseInt(anno as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
      });
      
      res.json(risultati);
    } catch (error) {
      console.error('❌ Errore ricerca norme:', error);
      res.status(500).json({ error: 'Errore ricerca norme' });
    }
  });

  // ========== GET NORMA SINGOLA ==========
  app.get('/api/norme/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const norma = await storageNormativa.getNorma(id);
      
      if (!norma) {
        return res.status(404).json({ error: 'Norma non trovata' });
      }
      
      res.json(norma);
    } catch (error) {
      console.error('❌ Errore GET norma:', error);
      res.status(500).json({ error: 'Errore recupero norma' });
    }
  });

  // ========== POST CREATE NORMA (STAFF ONLY) ==========
  app.post('/api/norme', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const parsed = createNormaSchema.parse(req.body);

      const norma = await storageNormativa.createNorma(parsed);
      console.log('✅ Norma creata:', norma.id);
      res.json(norma);
    } catch (error) {
      console.error('❌ Errore creazione norma:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Errore creazione norma' });
    }
  });

  // ========== PATCH UPDATE NORMA (STAFF ONLY) ==========
  app.patch('/api/norme/:id', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      const parsed = updateNormaSchema.parse(req.body);

      const norma = await storageNormativa.updateNorma(id, parsed);
      if (!norma) {
        return res.status(404).json({ error: 'Norma non trovata' });
      }

      console.log('✅ Norma aggiornata:', id);
      res.json(norma);
    } catch (error) {
      console.error('❌ Errore update norma:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Errore aggiornamento norma' });
    }
  });

  // ========== DELETE NORMA (STAFF ONLY) ==========
  app.delete('/api/norme/:id', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      const deleted = await storageNormativa.deleteNorma(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Norma non trovata' });
      }

      console.log('✅ Norma eliminata:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Errore eliminazione norma:', error);
      res.status(500).json({ error: 'Errore eliminazione norma' });
    }
  });

  // ========== GET ALL NORME (ADMIN PANEL) ==========
  app.get('/api/admin/norme', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const { tipo, anno, limit, offset } = req.query;

      const risultati = await storageNormativa.getAllNorme({
        tipo: tipo as string,
        anno: anno ? parseInt(anno as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(risultati);
    } catch (error) {
      console.error('❌ Errore lista norme admin:', error);
      res.status(500).json({ error: 'Errore recupero norme' });
    }
  });

  console.log('✅ Routes Normativa registrate');
}
