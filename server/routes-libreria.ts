import { Express, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { storageLibreria } from './storage-libreria';
import { materieEnum } from '../shared/schema-libreria';
import { requireAdminOrStaff, getUserId } from './middleware/auth';

// Multer config (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Validazione
const createDocumentoSchema = z.object({
  titolo: z.string().min(3, 'Titolo troppo corto'),
  descrizione: z.string().optional(),
  materia: z.enum(materieEnum as any),
  tags: z.array(z.string()).optional(),
  isStaffOnly: z.boolean().optional(),
});

export function registerLibreriaRoutes(app: Express) {
  console.log('📚 Registrazione routes Libreria Pubblica...');

  // ========== GET DOCUMENTI (pubblico) ==========
  app.get('/api/libreria/documenti', async (req: Request, res: Response) => {
    try {
      const { materia, search, limit } = req.query;
      
      const documenti = await storageLibreria.getDocumenti({
        materia: materia as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        staffOnly: false, // solo documenti pubblici
      });
      
      console.log(`📚 Trovati ${documenti.length} documenti`);
      
      // Rimuovi pdfBase64 dalla response (troppo pesante)
      const documentiSafe = documenti.map(d => ({
        ...d,
        pdfBase64: undefined,
        hasPdf: !!d.pdfBase64 || !!d.pdfUrl,
      }));
      
      res.json(documentiSafe);
    } catch (error) {
      console.error('❌ Errore GET documenti:', error);
      res.status(500).json({ error: 'Errore recupero documenti' });
    }
  });

  // ========== GET DOCUMENTO SINGOLO (con PDF) ==========
  app.get('/api/libreria/documenti/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const documento = await storageLibreria.getDocumento(id);
      
      if (!documento) {
        return res.status(404).json({ error: 'Documento non trovato' });
      }
      
      res.json(documento);
    } catch (error) {
      console.error('❌ Errore GET documento:', error);
      res.status(500).json({ error: 'Errore recupero documento' });
    }
  });

  // ========== POST UPLOAD DOCUMENTO (STAFF ONLY) ==========
  app.post(
    '/api/libreria/documenti',
    requireAdminOrStaff,
    upload.single('pdf'),
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ error: 'Non autenticato' });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'File PDF richiesto' });
        }

        // Validazione input
        let bodyData = { ...req.body };
        if (typeof bodyData.tags === 'string') {
            try {
                bodyData.tags = JSON.parse(bodyData.tags);
            } catch (e) {
                bodyData.tags = []; 
            }
        }
        
        if (bodyData.isStaffOnly === 'true') bodyData.isStaffOnly = true;
        if (bodyData.isStaffOnly === 'false') bodyData.isStaffOnly = false;

        const parsed = createDocumentoSchema.parse(bodyData);

        // Converti PDF in base64
        const pdfBase64 = file.buffer.toString('base64');

        const documento = await storageLibreria.createDocumento({
          titolo: parsed.titolo,
          descrizione: parsed.descrizione,
          materia: parsed.materia,
          tags: parsed.tags,
          pdfBase64,
          fileName: file.originalname,
          fileSize: file.size,
          uploadedBy: userId,
          isStaffOnly: parsed.isStaffOnly || false,
        });

        console.log('✅ Documento caricato:', documento.id);
        res.json(documento);
      } catch (error) {
        console.error('❌ Errore upload documento:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Errore upload documento' });
      }
    }
  );

  // ========== PATCH UPDATE DOCUMENTO (STAFF ONLY) ==========
  app.patch('/api/libreria/documenti/:id', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      const updates = req.body;

      const documento = await storageLibreria.updateDocumento(id, updates);
      res.json(documento);
    } catch (error) {
      console.error('❌ Errore update documento:', error);
      res.status(500).json({ error: 'Errore aggiornamento documento' });
    }
  });

  // ========== DELETE DOCUMENTO (STAFF ONLY) ==========
  app.delete('/api/libreria/documenti/:id', requireAdminOrStaff, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      await storageLibreria.deleteDocumento(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Errore delete documento:', error);
      res.status(500).json({ error: 'Errore eliminazione documento' });
    }
  });

  // ========== POST DOWNLOAD (incrementa counter) ==========
  app.post('/api/libreria/documenti/:id/download', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      await storageLibreria.incrementDownloads(id, userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Errore log download:', error);
      res.status(500).json({ error: 'Errore log download' });
    }
  });

  console.log('✅ Routes Libreria registrate');
}
