import { Express, Request, Response } from 'express';
import { storageNormativa } from './storage-normativa';

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

  console.log('✅ Routes Normativa registrate');
}
