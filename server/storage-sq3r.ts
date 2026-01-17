import { db } from './db';
import { fontiStudio, materieSQ3R, capitoliSQ3R, notebookLmSessions, quizzes, questions, answers } from '../shared/schema-sq3r';
import { documentiPubblici } from '../shared/schema-libreria';
import { eq, and, desc } from 'drizzle-orm';
import type { FonteStudio, InsertFonteStudio, MateriaSQ3R, InsertMateriaSQ3R, CapitoloSQ3R, InsertCapitoloSQ3R, NotebookLmSession, InsertNotebookLmSession } from '../shared/schema-sq3r';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class StorageSQ3R {
  
  // ============================================
  // FONTI STUDIO
  // ============================================

  async createFonteUpload(data: {
    userId: string;
    concorsoId: string;
    titolo: string;
    materia: string;
    pdfBase64: string;
    fileName: string;
    fileSize: number;
    numPages?: number;
  }) {
    try {
      const [fonte] = await db.insert(fontiStudio).values({
        userId: data.userId,
        concorsoId: data.concorsoId,
        tipo: 'upload',
        titolo: data.titolo,
        materia: data.materia,
        fileUrl: data.pdfBase64, // Using fileUrl to store base64 for now as per schema
        fileType: 'pdf',
        fileSize: data.fileSize,
        numeroTotalePagine: data.numPages,
      }).returning();

      console.log('✅ Fonte upload creata:', fonte.id);
      return fonte;
    } catch (error) {
      console.error('❌ Errore creazione fonte upload:', error);
      throw error;
    }
  }

  async updateFonteCapitoliEstratti(fonteId: string, userId: string, numCapitoli: number) {
    try {
      const [fonte] = await db.update(fontiStudio)
        .set({
          // capitoliEstratti: true, // Field removed from schema, handled via logic/status if needed
          updatedAt: new Date(),
        })
        .where(and(
          eq(fontiStudio.id, fonteId),
          eq(fontiStudio.userId, userId)
        ))
        .returning();

      console.log(`✅ Fonte aggiornata: ${numCapitoli} capitoli estratti`);
      return fonte;
    } catch (error) {
      console.error('❌ Errore aggiornamento fonte:', error);
      throw error;
    }
  }
  
  async createFonte(data: InsertFonteStudio): Promise<FonteStudio> {
    console.log('📚 StorageSQ3R.createFonte:', data);
    
    const [fonte] = await db
      .insert(fontiStudio)
      .values(data)
      .returning();
    
    console.log('✅ Fonte creata:', fonte.id);
    return fonte;
  }

  async createFonteDaLibreria(data: {
    userId: string;
    concorsoId: string;
    documentoLibreriaId: string;
  }): Promise<FonteStudio> {
    console.log('📚 StorageSQ3R.createFonteDaLibreria:', data);

    // 1. Recupera documento dalla libreria
    const [documento] = await db
      .select()
      .from(documentiPubblici)
      .where(eq(documentiPubblici.id, data.documentoLibreriaId));
    
    if (!documento) {
      throw new Error('Documento non trovato nella libreria');
    }
    
    // 2. Crea fonte collegata
    const [fonte] = await db.insert(fontiStudio)
      .values({
        userId: data.userId,
        concorsoId: data.concorsoId,
        tipo: 'libreria',
        
        // Copia metadati
        titolo: documento.titolo,
        descrizione: documento.descrizione,
        materia: documento.materia,
        
        // File info
        fileUrl: documento.pdfUrl,
        fileSize: documento.fileSize,
        fileType: 'pdf', // Assumiamo PDF per ora
        
        // Collegamento
        documentoLibreriaId: data.documentoLibreriaId,
        
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    console.log('✅ Fonte creata da libreria:', fonte.id);
    return fonte;
  }
  
  async getFonti(userId: string, concorsoId: string): Promise<FonteStudio[]> {
    console.log('📚 StorageSQ3R.getFonti:', { userId, concorsoId });
    
    const fonti = await db
      .select()
      .from(fontiStudio)
      .where(
        and(
          eq(fontiStudio.userId, userId),
          eq(fontiStudio.concorsoId, concorsoId)
        )
      )
      .orderBy(desc(fontiStudio.createdAt));
    
    console.log(`✅ ${fonti.length} fonti trovate`);
    return fonti;
  }
  
  async getFonte(id: string, userId: string): Promise<FonteStudio | undefined> {
    console.log('📚 StorageSQ3R.getFonte:', { id, userId });
    
    const [fonte] = await db
      .select()
      .from(fontiStudio)
      .where(
        and(
          eq(fontiStudio.id, id),
          eq(fontiStudio.userId, userId)
        )
      );
    
    return fonte;
  }
  
  async updateFonte(id: string, userId: string, data: Partial<InsertFonteStudio>): Promise<FonteStudio> {
    console.log('📚 StorageSQ3R.updateFonte:', { id, data });
    
    const [updated] = await db
      .update(fontiStudio)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(fontiStudio.id, id),
          eq(fontiStudio.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      throw new Error('Fonte non trovata o non autorizzato');
    }
    
    console.log('✅ Fonte aggiornata:', updated.id);
    return updated;
  }
  
  async deleteFonte(id: string, userId: string): Promise<void> {
    console.log('📚 StorageSQ3R.deleteFonte:', { id, userId });
    
    await db
      .delete(fontiStudio)
      .where(
        and(
          eq(fontiStudio.id, id),
          eq(fontiStudio.userId, userId)
        )
      );
    
    console.log('✅ Fonte eliminata');
  }

  // ==========================================
  // ESTRAZIONE CAPITOLI CON AI
  // ==========================================

  async estraiCapitoliDaFonte(fonteId: string, userId: string) {
    try {
      // 1. Recupera fonte con PDF
      const fonte = await this.getFonte(fonteId, userId);
      if (!fonte || !fonte.fileUrl) throw new Error('PDF non trovato');

      // 2. Decodifica PDF
      // Assumiamo che fileUrl contenga base64 se caricato tramite upload
      // Se è un URL remoto, bisognerebbe scaricarlo (ma per ora gestiamo base64)
      const isBase64 = fonte.fileUrl.startsWith('data:application/pdf;base64,') || !fonte.fileUrl.startsWith('http');
      const base64Data = fonte.fileUrl.replace(/^data:application\/pdf;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      // 3. Estrai testo con pdfjs-dist
      console.log(`📄 Avvio estrazione testo con pdf-parse (Buffer size: ${pdfBuffer.length} bytes)`);
      let testoCompleto = "";
      let numPagine = 0;
      
      try {
        const pdfParse = await import("pdf-parse");
        const pdfData = await pdfParse.default(pdfBuffer);
        numPagine = pdfData.numpages || 0;
        testoCompleto = pdfData.text || "";
        console.log(`📄 PDF caricato. Pagine totali: ${numPagine}`);
        console.log(`📄 Testo estratto: ${testoCompleto.length} caratteri`);
      } catch (pdfError: any) {
        console.error('❌ Errore durante parsing PDF con pdf-parse:', pdfError);
        throw new Error(`Impossibile leggere il PDF: ${pdfError.message}`);
      }

      // 4. Chiama OpenAI per identificare capitoli
      // Nota: materia potrebbe essere null, usiamo "Materia sconosciuta" come fallback
      const capitoliEstratti = await this.estraiCapitoliConAI(testoCompleto, fonte.materia || "Materia generale");

      // 5. Crea materia se non esiste
      let materia = await db.select()
        .from(materieSQ3R)
        .where(and(
          eq(materieSQ3R.userId, userId),
          eq(materieSQ3R.concorsoId, fonte.concorsoId),
          eq(materieSQ3R.nomeMateria, fonte.materia || "Nuova Materia")
        ))
        .then(rows => rows[0]);

      if (!materia) {
        [materia] = await db.insert(materieSQ3R).values({
          userId,
          concorsoId: fonte.concorsoId,
          nomeMateria: fonte.materia || "Nuova Materia",
          fonteId: fonteId, // Collega la materia alla fonte
          capitoliTotali: 0,
          capitoliCompletati: 0,
        }).returning();
      }

      // 6. Crea capitoli
      let capitoliCreati = 0;
      for (const cap of capitoliEstratti) {
        await db.insert(capitoliSQ3R).values({
          userId,
          materiaId: materia.id,
          numeroCapitolo: cap.numero,
          titolo: cap.titolo,
          pagineInizio: cap.pagineInizio,
          pagineFine: cap.pagineFine,
          faseCorrente: 'survey',
          pdfUrl: fonte.fileUrl, // Collegamento al PDF fonte
          pdfFileName: fonte.titolo + ".pdf",
          pdfFileSize: fonte.fileSize,
          pdfNumPages: numPagine,
        });
        capitoliCreati++;
      }

      // 7. Aggiorna contatore materia
      await db.update(materieSQ3R)
        .set({
          capitoliTotali: (materia.capitoliTotali || 0) + capitoliCreati,
          updatedAt: new Date(),
        })
        .where(eq(materieSQ3R.id, materia.id));

      // 8. Aggiorna fonte
      await this.updateFonteCapitoliEstratti(fonteId, userId, capitoliCreati);

      console.log(`✅ ${capitoliCreati} capitoli creati per materia ${fonte.materia}`);
      return { capitoliEstratti: capitoliCreati, materiaId: materia.id };
    } catch (error) {
      console.error('❌ Errore estrazione capitoli:', error);
      throw error;
    }
  }

  private async estraiCapitoliConAI(testo: string, materia: string): Promise<any[]> {
    try {
      console.log('🤖 Configurazione client OpenAI...');
      
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        console.error('❌ OpenAI API Key mancante nelle variabili d\'ambiente');
        throw new Error("OpenAI API Key mancante. Configura AI_INTEGRATIONS_OPENAI_API_KEY o OPENAI_API_KEY.");
      }
      
      // Dynamic import to avoid initialization issues
      let OpenAI;
      try {
        const module = await import("openai");
        OpenAI = module.default || module;
      } catch (importErr) {
        console.error('❌ Errore importazione modulo openai:', importErr);
        throw new Error("Errore interno: impossibile caricare client OpenAI");
      }
      
      const openai = new OpenAI({ 
        apiKey, 
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL 
      });

      // Tronca testo se troppo lungo (max ~100k caratteri)
      const testoTroncato = testo.slice(0, 100000);
      console.log(`🤖 Invio prompt a OpenAI (${testoTroncato.length} caratteri)...`);

      const prompt = `Sei un esperto di ${materia}. Analizza il seguente testo estratto da un PDF e identifica i capitoli principali.

Per ogni capitolo, restituisci:
- numero (intero progressivo)
- titolo (max 100 caratteri)
- pagineInizio (approssimativa)
- pagineFine (approssimativa)

Restituisci SOLO un JSON array senza altro testo:
[
  { "numero": 1, "titolo": "Introduzione al diritto", "pagineInizio": 1, "pagineFine": 15 },
  { "numero": 2, "titolo": "Fonti del diritto", "pagineInizio": 16, "pagineFine": 30 }
]

TESTO:
${testoTroncato}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Sei un assistente che estrae la struttura di documenti accademici.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';
      const result = JSON.parse(content);
      
      // OpenAI può restituire { capitoli: [...] } o direttamente [...] o { "capitoli": [...] }
      // Gestiamo vari casi
      let capitoli = [];
      if (Array.isArray(result)) capitoli = result;
      else if (result.capitoli && Array.isArray(result.capitoli)) capitoli = result.capitoli;
      else if (Object.keys(result).length > 0) {
         // Fallback: cerca la prima chiave che è un array
         const firstArrayKey = Object.keys(result).find(k => Array.isArray(result[k]));
         if (firstArrayKey) capitoli = result[firstArrayKey];
      }

      console.log(`🤖 AI ha identificato ${capitoli.length} capitoli`);
      return capitoli;
    } catch (error) {
      console.error('❌ Errore AI estrazione capitoli:', error);
      throw error;
    }
  }
  
  // ============================================
  // MATERIE SQ3R
  // ============================================
  
  async createMateria(data: InsertMateriaSQ3R): Promise<MateriaSQ3R> {
    console.log('📖 StorageSQ3R.createMateria:', data);
    
    // Rimuovi campi undefined per permettere al database di usare i valori default
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as InsertMateriaSQ3R;

    const [materia] = await db
      .insert(materieSQ3R)
      .values(cleanData)
      .returning();
    
    console.log('✅ Materia creata:', materia.id);
    return materia;
  }
  
  async getMaterie(userId: string, concorsoId: string): Promise<MateriaSQ3R[]> {
    console.log('📖 StorageSQ3R.getMaterie (con ricalcolo conteggi):', { userId, concorsoId });
    
    const materie = await db
      .select()
      .from(materieSQ3R)
      .where(
        and(
          eq(materieSQ3R.userId, userId),
          eq(materieSQ3R.concorsoId, concorsoId)
        )
      )
      .orderBy(materieSQ3R.ordine);
    
    // Ricalcolo dinamico dei conteggi per garantire coerenza
    // Questo risolve il problema dei contatori denormalizzati non sincronizzati
    for (const materia of materie) {
      const capitoli = await db
        .select({
          id: capitoliSQ3R.id,
          completato: capitoliSQ3R.completato
        })
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.userId, userId),
            eq(capitoliSQ3R.materiaId, materia.id)
          )
        );
        
      materia.capitoliTotali = capitoli.length;
      materia.capitoliCompletati = capitoli.filter(c => c.completato).length;
      
      // Opzionale: potremmo aggiornare il DB qui, ma per ora ci fidiamo del calcolo runtime
    }
    
    console.log(`✅ ${materie.length} materie trovate`);
    return materie;
  }
  
  async getMateria(id: string, userId: string): Promise<MateriaSQ3R | undefined> {
    console.log('📖 StorageSQ3R.getMateria:', { id, userId });
    
    const [materia] = await db
      .select()
      .from(materieSQ3R)
      .where(
        and(
          eq(materieSQ3R.id, id),
          eq(materieSQ3R.userId, userId)
        )
      );
    
    return materia;
  }
  
  async updateMateria(id: string, userId: string, data: Partial<InsertMateriaSQ3R>): Promise<MateriaSQ3R> {
    console.log('📖 StorageSQ3R.updateMateria:', { id, data });
    
    const [updated] = await db
      .update(materieSQ3R)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(materieSQ3R.id, id),
          eq(materieSQ3R.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      throw new Error('Materia non trovata o non autorizzato');
    }
    
    console.log('✅ Materia aggiornata:', updated.id);
    return updated;
  }
  
  async deleteMateria(id: string, userId: string): Promise<void> {
    console.log('📖 StorageSQ3R.deleteMateria:', { id, userId });
    
    await db
      .delete(materieSQ3R)
      .where(
        and(
          eq(materieSQ3R.id, id),
          eq(materieSQ3R.userId, userId)
        )
      );
    
    console.log('✅ Materia eliminata');
  }
  
  // ============================================
  // CAPITOLI SQ3R
  // ============================================
  
  async createCapitolo(data: InsertCapitoloSQ3R): Promise<CapitoloSQ3R> {
    console.log('📄 StorageSQ3R.createCapitolo:', { ...data, pdfUrl: data.pdfUrl ? 'PRESENT (base64)' : undefined });
    
    // NOTA: Se data.pdfUrl è presente, il returning() lo restituirà indietro,
    // causando un payload di risposta enorme. Dobbiamo evitarlo.
    
    const [capitolo] = await db
      .insert(capitoliSQ3R)
      .values(data)
      .returning();
    
    // Aggiorna contatore materia
    const materia = await this.getMateria(data.materiaId, data.userId);
    if (materia) {
      await this.updateMateria(data.materiaId, data.userId, {
        capitoliTotali: (materia.capitoliTotali || 0) + 1
      });
    }
    
    console.log('✅ Capitolo creato:', capitolo.id);
    
    // 🆕 Rimuovi pdfUrl dall'oggetto ritornato per evitare payload giganti
    const { pdfUrl, ...capitoloLight } = capitolo;
    return capitoloLight as CapitoloSQ3R;
  }
  
  async getCapitoli(userId: string, materiaId?: string): Promise<CapitoloSQ3R[]> {
    console.log('📄 StorageSQ3R.getCapitoli:', { userId, materiaId });
    
    // Select specifica per escludere pdfUrl
    const selectFields = {
      id: capitoliSQ3R.id,
      userId: capitoliSQ3R.userId,
      materiaId: capitoliSQ3R.materiaId,
      numeroCapitolo: capitoliSQ3R.numeroCapitolo,
      titolo: capitoliSQ3R.titolo,
      pagineInizio: capitoliSQ3R.pagineInizio,
      pagineFine: capitoliSQ3R.pagineFine,
      surveyCompletato: capitoliSQ3R.surveyCompletato,
      questionCompletato: capitoliSQ3R.questionCompletato,
      readCompletato: capitoliSQ3R.readCompletato,
      reciteCompletato: capitoliSQ3R.reciteCompletato,
      reviewCompletato: capitoliSQ3R.reviewCompletato,
      completato: capitoliSQ3R.completato,
      faseCorrente: capitoliSQ3R.faseCorrente,
      surveyConcettiChiave: capitoliSQ3R.surveyConcettiChiave,
      surveyChecklist: capitoliSQ3R.surveyChecklist,
      domande: capitoliSQ3R.domande,
      domandeAI: capitoliSQ3R.domandeAI,
      highlights: capitoliSQ3R.readHighlights,
      reciteData: capitoliSQ3R.reciteData,
      reviewData: capitoliSQ3R.reviewData,
      pdfFileName: capitoliSQ3R.pdfFileName,
      pdfFileSize: capitoliSQ3R.pdfFileSize,
      pdfNumPages: capitoliSQ3R.pdfNumPages,
      createdAt: capitoliSQ3R.createdAt,
      updatedAt: capitoliSQ3R.updatedAt,
    };

    try {
      let query = db
        .select(selectFields)
        .from(capitoliSQ3R)
        .where(eq(capitoliSQ3R.userId, userId));
      
      let capitoli: any[] = [];

      if (materiaId) {
        capitoli = await db
          .select(selectFields)
          .from(capitoliSQ3R)
          .where(
            and(
              eq(capitoliSQ3R.userId, userId),
              eq(capitoliSQ3R.materiaId, materiaId)
            )
          )
          .orderBy(capitoliSQ3R.numeroCapitolo);
      } else {
        capitoli = await query.orderBy(capitoliSQ3R.numeroCapitolo);
      }

      // Parse JSON fields
      return capitoli.map(c => {
         return {
           ...c,
           reciteData: c.reciteData && typeof c.reciteData === 'string' ? JSON.parse(c.reciteData) : c.reciteData,
           reviewData: c.reviewData && typeof c.reviewData === 'string' ? JSON.parse(c.reviewData) : c.reviewData
         };
      });
    } catch (error) {
       console.error('❌ Error in getCapitoli query:', error);
       throw error;
    }
  }
  
  async getCapitolo(id: string, userId: string): Promise<CapitoloSQ3R | undefined> {
    console.log('📄 StorageSQ3R.getCapitolo:', { id, userId });
    
    try {
      const [capitolo] = await db
        .select({
          id: capitoliSQ3R.id,
          userId: capitoliSQ3R.userId,
          materiaId: capitoliSQ3R.materiaId,
          numeroCapitolo: capitoliSQ3R.numeroCapitolo,
          titolo: capitoliSQ3R.titolo,
          pagineInizio: capitoliSQ3R.pagineInizio,
          pagineFine: capitoliSQ3R.pagineFine,
          surveyCompletato: capitoliSQ3R.surveyCompletato,
          questionCompletato: capitoliSQ3R.questionCompletato,
          readCompletato: capitoliSQ3R.readCompletato,
          reciteCompletato: capitoliSQ3R.reciteCompletato,
          reviewCompletato: capitoliSQ3R.reviewCompletato,
          completato: capitoliSQ3R.completato,
          faseCorrente: capitoliSQ3R.faseCorrente,
          surveyConcettiChiave: capitoliSQ3R.surveyConcettiChiave,
          surveyChecklist: capitoliSQ3R.surveyChecklist,
          domande: capitoliSQ3R.domande,
          domandeAI: capitoliSQ3R.domandeAI,
          highlights: capitoliSQ3R.readHighlights,
          reciteData: capitoliSQ3R.reciteData,
          reviewData: capitoliSQ3R.reviewData,
          pdfFileName: capitoliSQ3R.pdfFileName,
          pdfFileSize: capitoliSQ3R.pdfFileSize,
          pdfNumPages: capitoliSQ3R.pdfNumPages,
          createdAt: capitoliSQ3R.createdAt,
          updatedAt: capitoliSQ3R.updatedAt,
        })
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );
      
      if (capitolo) {
        // Parse JSON fields
        if (capitolo.reciteData && typeof capitolo.reciteData === 'string') {
          try {
            capitolo.reciteData = JSON.parse(capitolo.reciteData);
          } catch (e) {
            console.error('Error parsing reciteData', e);
          }
        }
        if (capitolo.reviewData && typeof capitolo.reviewData === 'string') {
          try {
            capitolo.reviewData = JSON.parse(capitolo.reviewData);
          } catch (e) {
            console.error('Error parsing reviewData', e);
          }
        }
        return capitolo as any;
      }
      return undefined;
    } catch (error) {
      console.error('❌ Error in getCapitolo query:', error);
      throw error;
    }
  }
  
  async updateCapitolo(id: string, userId: string, data: Partial<InsertCapitoloSQ3R>): Promise<CapitoloSQ3R> {
    console.log('📄 StorageSQ3R.updateCapitolo:', { id, data });
    
    // FIX: Assicura che i campi complessi salvati come TEXT siano stringificati correttamente
    // Drizzle con .$type() su colonna text non fa auto-stringify
    const updateData = { ...data };

    if (updateData.reciteData && typeof updateData.reciteData !== 'string') {
      updateData.reciteData = JSON.stringify(updateData.reciteData) as any;
    }

    if (updateData.reviewData && typeof updateData.reviewData !== 'string') {
      updateData.reviewData = JSON.stringify(updateData.reviewData) as any;
    }

    const [updated] = await db
      .update(capitoliSQ3R)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(capitoliSQ3R.id, id),
          eq(capitoliSQ3R.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      throw new Error('Capitolo non trovato o non autorizzato');
    }
    
    // Se il capitolo è stato completato, aggiorna il contatore della materia
    if (data.completato === true && updated.materiaId) {
      // Verifica se il capitolo era GIÀ completato prima dell'update
      const currentCapitolo = await this.getCapitolo(id, userId);
      // Nota: getCapitolo ritorna i dati aggiornati perché l'update è già avvenuto
      // Ma possiamo controllare se l'incremento è necessario in modo più furbo
      // Oppure, semplicemente ci fidiamo che il client invii completato=true solo alla fine.
      // Un approccio migliore: leggere PRIMA dell'update.
      
      // Dato che abbiamo già fatto l'update, usiamo una logica idempotente basata sul conteggio reale
      const materia = await this.getMateria(updated.materiaId, userId);
      if (materia) {
        // Ricalcola il conteggio reale dei capitoli completati per questa materia
        const capitoliCompletatiCount = await db
          .select({ count: capitoliSQ3R.id })
          .from(capitoliSQ3R)
          .where(
            and(
              eq(capitoliSQ3R.materiaId, updated.materiaId),
              eq(capitoliSQ3R.userId, userId),
              eq(capitoliSQ3R.completato, true)
            )
          )
          .then(rows => rows.length);

        await this.updateMateria(updated.materiaId, userId, {
          capitoliCompletati: capitoliCompletatiCount
        });
      }
    }
    
    console.log('✅ Capitolo aggiornato:', updated.id);
    return updated;
  }
  
  async deleteCapitolo(id: string, userId: string): Promise<void> {
    console.log('📄 StorageSQ3R.deleteCapitolo:', { id, userId });
    
    // Ottieni il capitolo per aggiornare il contatore della materia
    const capitolo = await this.getCapitolo(id, userId);
    
    await db
      .delete(capitoliSQ3R)
      .where(
        and(
          eq(capitoliSQ3R.id, id),
          eq(capitoliSQ3R.userId, userId)
        )
      );
    
    // Aggiorna contatore materia
    if (capitolo && capitolo.materiaId) {
      const materia = await this.getMateria(capitolo.materiaId, userId);
      if (materia) {
        await this.updateMateria(capitolo.materiaId, userId, {
          capitoliTotali: Math.max(0, (materia.capitoliTotali || 0) - 1),
          capitoliCompletati: capitolo.completato
            ? Math.max(0, (materia.capitoliCompletati || 0) - 1)
            : materia.capitoliCompletati
        });
      }
    }
    
    console.log('✅ Capitolo eliminato');
  }
  
  // ============================================
  // NOTEBOOKLM SESSIONS
  // ============================================
  
  async createNotebookSession(data: InsertNotebookLmSession): Promise<NotebookLmSession> {
    console.log('🤖 StorageSQ3R.createNotebookSession:', data);
    
    const [session] = await db
      .insert(notebookLmSessions)
      .values(data)
      .returning();
    
    console.log('✅ Notebook session creata:', session.id);
    return session;
  }
  
  async getNotebookSessions(userId: string, concorsoId: string): Promise<NotebookLmSession[]> {
    console.log('🤖 StorageSQ3R.getNotebookSessions:', { userId, concorsoId });
    
    const sessions = await db
      .select()
      .from(notebookLmSessions)
      .where(
        and(
          eq(notebookLmSessions.userId, userId),
          eq(notebookLmSessions.concorsoId, concorsoId)
        )
      )
      .orderBy(desc(notebookLmSessions.createdAt));
    
    console.log(`✅ ${sessions.length} sessions trovate`);
    return sessions;
  }
  
  async getNotebookSession(id: string, userId: string): Promise<NotebookLmSession | undefined> {
    console.log('🤖 StorageSQ3R.getNotebookSession:', { id, userId });
    
    const [session] = await db
      .select()
      .from(notebookLmSessions)
      .where(
        and(
          eq(notebookLmSessions.id, id),
          eq(notebookLmSessions.userId, userId)
        )
      );
    
    return session;
  }
  
  async updateNotebookSession(id: string, userId: string, data: Partial<InsertNotebookLmSession>): Promise<NotebookLmSession> {
    console.log('🤖 StorageSQ3R.updateNotebookSession:', { id, data });
    
    const [updated] = await db
      .update(notebookLmSessions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(notebookLmSessions.id, id),
          eq(notebookLmSessions.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      throw new Error('Notebook session non trovata o non autorizzato');
    }
    
    console.log('✅ Notebook session aggiornata:', updated.id);
    return updated;
  }

  // ============================================
  // QUIZ SYSTEM
  // ============================================

  async ricalcolaContatori(materiaId: string): Promise<{ totali: number; completati: number }> {
    console.log('🔄 Ricalcolo contatori per materia:', materiaId);
    
    try {
      // Conta capitoli reali
      const capitoli = await db
        .select()
        .from(capitoliSQ3R)
        .where(eq(capitoliSQ3R.materiaId, materiaId));
      
      const totali = capitoli.length;
      const completati = capitoli.filter(c => c.completato).length;
      
      // Aggiorna materia
      await db
        .update(materieSQ3R)
        .set({
          capitoliTotali: totali,
          capitoliCompletati: completati,
          updatedAt: new Date(),
        })
        .where(eq(materieSQ3R.id, materiaId));
      
      console.log('✅ Contatori aggiornati:', { totali, completati });
      
      return { totali, completati };
    } catch (error) {
      console.error('❌ Errore ricalcolo contatori:', error);
      throw error;
    }
  }

  async createQuiz(capitoloId: string, questionsData: Array<{
    domanda: string;
    opzioni: string[];
    rispostaCorretta: number;
    spiegazione: string;
  }>): Promise<any> {
    console.log('❓ StorageSQ3R.createQuiz:', { capitoloId, questionsCount: questionsData.length });

    // 1. Create Quiz
    const [quiz] = await db.insert(quizzes).values({
      capitoloId
    }).returning();

    // 2. Create Questions and Answers
    for (const qData of questionsData) {
      const [question] = await db.insert(questions).values({
        quizId: quiz.id,
        questionText: qData.domanda,
        correctAnswerIndex: qData.rispostaCorretta, // Keep for legacy/redundancy
        explanation: qData.spiegazione
      }).returning();

      // Insert answers
      for (let i = 0; i < qData.opzioni.length; i++) {
        await db.insert(answers).values({
          questionId: question.id,
          answerText: qData.opzioni[i],
          isCorrect: i === qData.rispostaCorretta
        });
      }
    }

    return this.getQuizByCapitoloId(capitoloId);
  }

  async getQuizByCapitoloId(capitoloId: string): Promise<any> {
    // Fetch latest quiz
    const [quiz] = await db.select().from(quizzes)
      .where(eq(quizzes.capitoloId, capitoloId))
      .orderBy(desc(quizzes.createdAt))
      .limit(1);

    if (!quiz) return null;

    // Fetch questions
    const qs = await db.select().from(questions)
      .where(eq(questions.quizId, quiz.id));

    // Construct response compatible with frontend
    const formattedQuestions = [];
    
    for (const q of qs) {
      const ans = await db.select().from(answers)
        .where(eq(answers.questionId, q.id));
      
      // Fisher-Yates shuffle on retrieval
      const shuffledAnswers = [...ans];
      for (let i = shuffledAnswers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
      }

      // Find new correct index
      const correctIndex = shuffledAnswers.findIndex(a => a.isCorrect);

      formattedQuestions.push({
        domanda: q.questionText,
        opzioni: shuffledAnswers.map(a => a.answerText),
        rispostaCorretta: correctIndex,
        spiegazione: q.explanation
      });
    }

    return {
      id: quiz.id,
      domande: formattedQuestions,
      createdAt: quiz.createdAt
    };
  }
}

export const storageSQ3R = new StorageSQ3R();
