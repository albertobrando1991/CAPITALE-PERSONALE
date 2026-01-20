/**
 * Robust PDF Text Extraction Service
 *
 * Uses multiple methods to extract text from PDFs:
 * 1. pdf.js (Mozilla) - Best for digitally signed PDFs
 * 2. pdf-parse - Fallback for standard PDFs
 * 3. Tesseract.js OCR - For scanned/image-based PDFs
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';

// Disable worker for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

interface ExtractionResult {
  text: string;
  method: 'pdfjs' | 'pdfparse' | 'ocr';
  pageCount: number;
  confidence?: number;
}

/**
 * Extract text from PDF using pdf.js (Mozilla)
 * Better handling for digitally signed PDFs
 */
async function extractWithPdfJs(buffer: Buffer): Promise<ExtractionResult | null> {
  try {
    console.log('[PDF-EXTRACTION] Attempting pdf.js extraction...');

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
      // Attempt to recover from errors
      stopAtErrors: false,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    console.log(`[PDF-EXTRACTION] pdf.js loaded ${numPages} pages`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text items and join them
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');

        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`[PDF-EXTRACTION] Warning: Could not extract page ${pageNum}:`, pageError);
        // Continue with other pages
      }
    }

    const cleanedText = fullText.trim();

    if (cleanedText.length < 100) {
      console.log(`[PDF-EXTRACTION] pdf.js extracted insufficient text (${cleanedText.length} chars)`);
      return null;
    }

    console.log(`[PDF-EXTRACTION] pdf.js successfully extracted ${cleanedText.length} chars from ${numPages} pages`);

    return {
      text: cleanedText,
      method: 'pdfjs',
      pageCount: numPages
    };
  } catch (error: any) {
    console.error('[PDF-EXTRACTION] pdf.js extraction failed:', error.message);
    return null;
  }
}

/**
 * Extract text from PDF using pdf-parse (legacy fallback)
 */
async function extractWithPdfParse(buffer: Buffer): Promise<ExtractionResult | null> {
  try {
    console.log('[PDF-EXTRACTION] Attempting pdf-parse extraction...');

    // Dynamic import to avoid issues
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);

    const cleanedText = data.text?.trim() || '';

    if (cleanedText.length < 100) {
      console.log(`[PDF-EXTRACTION] pdf-parse extracted insufficient text (${cleanedText.length} chars)`);
      return null;
    }

    console.log(`[PDF-EXTRACTION] pdf-parse successfully extracted ${cleanedText.length} chars from ${data.numpages} pages`);

    return {
      text: cleanedText,
      method: 'pdfparse',
      pageCount: data.numpages
    };
  } catch (error: any) {
    console.error('[PDF-EXTRACTION] pdf-parse extraction failed:', error.message);
    return null;
  }
}

/**
 * Convert PDF page to image for OCR
 * Uses canvas rendering from pdf.js
 */
async function renderPageToImage(buffer: Buffer, pageNum: number): Promise<Buffer | null> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    // Get page viewport at 2x scale for better OCR quality
    const viewport = page.getViewport({ scale: 2.0 });

    // Create a canvas-like object for Node.js
    // Note: This requires node-canvas which we'll add
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render the page to canvas
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport: viewport,
    } as any).promise;

    // Convert canvas to PNG buffer
    return canvas.toBuffer('image/png');
  } catch (error: any) {
    console.error(`[PDF-EXTRACTION] Failed to render page ${pageNum} to image:`, error.message);
    return null;
  }
}

/**
 * Extract text from PDF using OCR (Tesseract.js)
 * Used for scanned documents or when other methods fail
 */
async function extractWithOCR(buffer: Buffer): Promise<ExtractionResult | null> {
  try {
    console.log('[PDF-EXTRACTION] Attempting OCR extraction (this may take a while)...');

    // First, get the number of pages
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    // Limit OCR to first 10 pages to avoid excessive processing time
    const maxPages = Math.min(numPages, 10);
    console.log(`[PDF-EXTRACTION] OCR will process ${maxPages} of ${numPages} pages`);

    let fullText = '';
    let totalConfidence = 0;
    let processedPages = 0;

    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker('ita', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[PDF-EXTRACTION] OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    try {
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        console.log(`[PDF-EXTRACTION] Processing page ${pageNum}/${maxPages} with OCR...`);

        const imageBuffer = await renderPageToImage(buffer, pageNum);
        if (!imageBuffer) {
          console.warn(`[PDF-EXTRACTION] Skipping page ${pageNum} - could not render to image`);
          continue;
        }

        const result = await worker.recognize(imageBuffer);

        if (result.data.text) {
          fullText += result.data.text + '\n\n';
          totalConfidence += result.data.confidence;
          processedPages++;
        }
      }
    } finally {
      await worker.terminate();
    }

    const cleanedText = fullText.trim();
    const avgConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;

    if (cleanedText.length < 100) {
      console.log(`[PDF-EXTRACTION] OCR extracted insufficient text (${cleanedText.length} chars)`);
      return null;
    }

    console.log(`[PDF-EXTRACTION] OCR successfully extracted ${cleanedText.length} chars from ${processedPages} pages (confidence: ${avgConfidence.toFixed(1)}%)`);

    return {
      text: cleanedText,
      method: 'ocr',
      pageCount: processedPages,
      confidence: avgConfidence
    };
  } catch (error: any) {
    console.error('[PDF-EXTRACTION] OCR extraction failed:', error.message);
    return null;
  }
}

/**
 * Simple OCR extraction without canvas (using base64 data URL)
 * Fallback when node-canvas is not available
 */
async function extractWithSimpleOCR(buffer: Buffer): Promise<ExtractionResult | null> {
  try {
    console.log('[PDF-EXTRACTION] Attempting simple OCR extraction...');

    // For now, we'll try OCR on the raw PDF buffer
    // Some PDFs contain embedded images that Tesseract can read
    const worker = await Tesseract.createWorker('ita', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[PDF-EXTRACTION] OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    try {
      // Try to recognize text directly from PDF (works for some image-PDFs)
      const result = await worker.recognize(buffer);

      const cleanedText = result.data.text?.trim() || '';

      if (cleanedText.length < 100) {
        console.log(`[PDF-EXTRACTION] Simple OCR extracted insufficient text (${cleanedText.length} chars)`);
        return null;
      }

      console.log(`[PDF-EXTRACTION] Simple OCR extracted ${cleanedText.length} chars (confidence: ${result.data.confidence.toFixed(1)}%)`);

      return {
        text: cleanedText,
        method: 'ocr',
        pageCount: 1,
        confidence: result.data.confidence
      };
    } finally {
      await worker.terminate();
    }
  } catch (error: any) {
    console.error('[PDF-EXTRACTION] Simple OCR extraction failed:', error.message);
    return null;
  }
}

/**
 * Main extraction function - tries multiple methods
 */
export async function extractTextFromPDFRobust(buffer: Buffer): Promise<ExtractionResult> {
  console.log('[PDF-EXTRACTION] Starting robust PDF text extraction...');
  console.log(`[PDF-EXTRACTION] PDF buffer size: ${buffer.length} bytes`);

  // Validate PDF header
  const header = buffer.slice(0, 5).toString('ascii');
  if (!header.startsWith('%PDF')) {
    throw new Error(`Invalid PDF file (header: ${header})`);
  }

  // Method 1: Try pdf.js (best for signed PDFs)
  let result = await extractWithPdfJs(buffer);
  if (result && result.text.length >= 100) {
    return result;
  }

  // Method 2: Try pdf-parse (legacy, good for standard PDFs)
  result = await extractWithPdfParse(buffer);
  if (result && result.text.length >= 100) {
    return result;
  }

  // Method 3: Try OCR with canvas rendering
  try {
    result = await extractWithOCR(buffer);
    if (result && result.text.length >= 100) {
      return result;
    }
  } catch (canvasError: any) {
    console.log('[PDF-EXTRACTION] Canvas-based OCR not available, trying simple OCR...');
  }

  // Method 4: Try simple OCR (fallback)
  result = await extractWithSimpleOCR(buffer);
  if (result && result.text.length >= 100) {
    return result;
  }

  // If all methods failed
  throw new Error('Impossibile estrarre testo dal PDF. Il documento potrebbe essere scansionato, protetto o corrotto.');
}

/**
 * Quick check if PDF is likely scanned (image-based)
 */
export async function isPdfScanned(buffer: Buffer): Promise<boolean> {
  try {
    const result = await extractWithPdfJs(buffer);
    if (!result || result.text.length < 50) {
      return true; // Likely scanned
    }

    // Check if text is mostly whitespace or symbols
    const alphaNumeric = result.text.replace(/[^a-zA-Z0-9àèéìòù]/g, '');
    if (alphaNumeric.length < result.text.length * 0.3) {
      return true; // Likely scanned with poor text layer
    }

    return false;
  } catch {
    return true; // Assume scanned if we can't parse it
  }
}
