import type { Express } from 'express'; 
import { db } from './db'; 
import { catalogoEdises } from '../shared/schema-sq3r'; 
import { eq } from 'drizzle-orm'; 

export function registerEdisesRoutes(app: Express) { 
  console.log('📚 [INIT] Registrazione routes Edises...'); 

  // GET - Catalogo completo o filtrato per materia 
  app.get('/api/catalogo-edises', async (req, res) => { 
    try { 
      console.log('📥 GET /api/catalogo-edises'); 
      const { materia } = req.query; 

      let query = db.select().from(catalogoEdises); 
      
      if (materia) { 
        console.log(`  🔍 Filtro per materia: ${materia}`); 
        
        let materiaFilter = materia as string;
        // Mappa il filtro frontend 'Testi Specifici...' al valore DB 'Altro' se necessario
        if (materiaFilter === 'Testi Specifici per Concorsi Pubblici') {
             // Proviamo a cercare sia 'Altro' che il testo esatto per coprire entrambi i casi (se l'enum fosse stato aggiornato)
             // Ma per ora usiamo una logica OR o un fallback intelligente.
             // Dato che il seed usa 'Altro', mappiamo a quello.
             materiaFilter = 'Altro';
        }

        // Cast esplicito per evitare problemi di tipo con enum
        // @ts-ignore
        query = db.select().from(catalogoEdises).where(eq(catalogoEdises.materia, materiaFilter)); 
      } 

      const catalogo = await query.orderBy(catalogoEdises.popolare, catalogoEdises.titolo); 
      
      console.log(`  ✅ Trovati ${catalogo.length} manuali`); 
      res.json(catalogo); 
    } catch (error) { 
      console.error('❌ Errore caricamento catalogo:', error); 
      res.status(500).json({ error: 'Errore caricamento catalogo' }); 
    } 
  }); 

  // GET - Dettaglio singolo manuale 
  app.get('/api/catalogo-edises/:isbn', async (req, res) => { 
    try { 
      const { isbn } = req.params; 
      
      const [manuale] = await db.select() 
        .from(catalogoEdises) 
        .where(eq(catalogoEdises.isbn, isbn)); 

      if (!manuale) { 
        return res.status(404).json({ error: 'Manuale non trovato' }); 
      } 

      res.json(manuale); 
    } catch (error) { 
      console.error('❌ Errore recupero manuale:', error); 
      res.status(500).json({ error: 'Errore recupero manuale' }); 
    } 
  }); 

  // POST - Tracking click affiliato (analytics) 
  app.post('/api/catalogo-edises/:isbn/track', async (req, res) => { 
    try { 
      const { isbn } = req.params; 
      
      // Log per analytics (opzionale: salvare in tabella tracking) 
      console.log(`📊 Click affiliato: ISBN ${isbn} da IP ${req.ip}`); 
      
      // TODO: In futuro salvare in tabella analytics 
      // await db.insert(affiliateClicks).values({ isbn, userId: req.user?.id, ip: req.ip }); 

      res.json({ success: true }); 
    } catch (error) { 
      console.error('❌ Errore tracking:', error); 
      res.status(500).json({ error: 'Errore tracking' }); 
    } 
  }); 

  console.log('✅ Routes Edises registrate'); 
}