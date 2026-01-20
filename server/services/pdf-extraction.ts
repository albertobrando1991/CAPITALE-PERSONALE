/**
 * Robust PDF Text Extraction Service
 *
 * Uses multiple methods to extract text from PDFs:
 * 1. pdf.js (Mozilla) - Best for digitally signed PDFs
 * 2. pdf-parse - Fallback for standard PDFs
 * 
 * Note: OCR (Tesseract.js) is disabled because it requires native binaries
 * that are not available in Vercel Serverless Functions.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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
 * Main extraction function - tries multiple methods
 * 
 * Note: OCR methods have been disabled for Vercel compatibility.
 * If you need OCR, consider using a cloud-based OCR service.
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

  // OCR methods are disabled on Vercel Serverless Functions
  // If both text extraction methods fail, the PDF is likely a scanned document
  console.log('[PDF-EXTRACTION] Text extraction methods failed. OCR is not available on Vercel.');

  // If all methods failed
  throw new Error('Impossibile estrarre testo dal PDF. Il documento potrebbe essere scansionato, protetto o corrotto. L\'OCR non è disponibile su Vercel.');
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
