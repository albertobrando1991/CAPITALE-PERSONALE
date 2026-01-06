import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Highlighter,
  X,
  Trash2,
  Copy,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface Highlight {
  id: string;
  pagina: number;
  testo: string;
  nota?: string;
  colore: string;
  posizione: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: string;
}

interface PDFViewerProps {
  capitoloId: string; // 🆕 Passa ID invece di URL
  highlights: Highlight[];
  onHighlightAdd: (highlight: Omit<Highlight, 'id' | 'timestamp'>) => void;
  onHighlightRemove: (id: string) => void;
  onHighlightUpdate: (id: string, nota: string) => void;
  onClearAll?: () => void;
  paginaIniziale?: number;
}

export function PDFViewerWithHighlights({
  capitoloId,
  highlights,
  onHighlightAdd,
  onHighlightRemove,
  onHighlightUpdate,
  onClearAll,
  paginaIniziale = 1
}: PDFViewerProps) {
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(paginaIniziale);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#FFEB3B');
  const [highlightNota, setHighlightNota] = useState('');
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const [tempHighlightPos, setTempHighlightPos] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);

  const [isManualMode, setIsManualMode] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);

  const handleManualMouseDown = (e: React.MouseEvent) => {
    if (!isManualMode || !pdfWrapperRef.current) return;
    const rect = pdfWrapperRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleManualMouseMove = (e: React.MouseEvent) => {
    if (!isManualMode || !dragStart || !pdfWrapperRef.current) return;
    const rect = pdfWrapperRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCurrentDragRect({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      width: Math.abs(currentX - dragStart.x),
      height: Math.abs(currentY - dragStart.y)
    });
  };

  const handleManualMouseUp = () => {
    if (!isManualMode || !dragStart || !currentDragRect) {
      setDragStart(null);
      setCurrentDragRect(null);
      return;
    }

    // Convert to pdf scale
    const highlightPos = {
      x: currentDragRect.x / scale,
      y: currentDragRect.y / scale,
      width: currentDragRect.width / scale,
      height: currentDragRect.height / scale
    };

    if (highlightPos.width > 5 && highlightPos.height > 5) {
        setTempHighlightPos(highlightPos);
        setSelectedText(''); // 🆕 Lascia vuoto per permettere l'inserimento manuale
        setShowHighlightModal(true);
     }

    setDragStart(null);
    setCurrentDragRect(null);
    // Non disattiviamo manual mode qui per mantenere lo stato durante il modale
  };


  // 🆕 Query separata per PDF (lazy load)
  const { 
    data: pdfData, 
    isLoading: isLoadingPdf, 
    error: pdfError, 
  } = useQuery({ 
    queryKey: ['capitolo-pdf', capitoloId], 
    queryFn: async () => { 
      console.log('🔄 Caricamento PDF...'); 
      const startTime = performance.now(); 

      const res = await fetch(`/api/sq3r/capitoli/${capitoloId}/pdf`, { 
        credentials: 'include', 
      }); 

      if (!res.ok) throw new Error('Errore caricamento PDF'); 

      const data = await res.json(); 
      
      const duration = performance.now() - startTime; 
      console.log(`✅ PDF caricato in ${duration.toFixed(0)}ms`); 

      return data; 
    }, 
    staleTime: 5 * 60 * 1000, // Cache 5 minuti 
    gcTime: 10 * 60 * 1000, 
    retry: 2, 
  }); 

  // Loading state 
  if (isLoadingPdf) { 
    return ( 
      <div className="h-full flex items-center justify-center bg-muted/30"> 
        <div className="text-center space-y-4"> 
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /> 
          <div> 
            <p className="font-medium">Caricamento PDF...</p> 
            <p className="text-sm text-muted-foreground"> 
              Questo potrebbe richiedere alcuni secondi 
            </p> 
          </div> 
        </div> 
      </div> 
    ); 
  } 

  // Error state 
  if (pdfError || !pdfData?.pdfUrl) { 
    return ( 
      <div className="h-full flex items-center justify-center bg-muted/30"> 
        <div className="text-center space-y-4"> 
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" /> 
          <div> 
            <p className="font-medium">Errore caricamento PDF</p> 
            <p className="text-sm text-muted-foreground"> 
              {pdfError?.message || 'PDF non disponibile'} 
            </p> 
          </div> 
        </div> 
      </div> 
    ); 
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log(`📄 PDF renderizzato: ${numPages} pagine`);
  };
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !pdfWrapperRef.current) return;
    
    const text = selection.toString().trim();
    if (text && text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wrapperRect = pdfWrapperRef.current.getBoundingClientRect();

      // Calcola coordinate relative al wrapper e normalizzate per la scala
      const highlightPos = {
        x: (rect.left - wrapperRect.left) / scale,
        y: (rect.top - wrapperRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale
      };

      setTempHighlightPos(highlightPos);
      setSelectedText(text);
      setShowHighlightModal(true);
    }
  };
  
  const salvaHighlight = () => {
    if (!tempHighlightPos) return;
    
    // Per highlight manuali (immagini), permetti salvataggio anche senza testo (usa default)
    const testoFinale = selectedText.trim() || "Area Grafica";
    
    onHighlightAdd({
      pagina: pageNumber,
      testo: testoFinale,
      nota: highlightNota,
      colore: highlightColor,
      posizione: tempHighlightPos
    });
    
    // Reset
    setSelectedText('');
    setHighlightNota('');
    setTempHighlightPos(null);
    setShowHighlightModal(false);
    setIsManualMode(false); // Disattiva manual mode dopo il salvataggio
    window.getSelection()?.removeAllRanges();
  };
  
  const handleCopyText = async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        toast({
          title: "Testo copiato",
          description: "Il testo è stato copiato negli appunti"
        });
      } catch (err) {
        toast({
          title: "Errore copia",
          description: "Impossibile copiare il testo",
          variant: "destructive"
        });
      }
    }
  };
  
  const highlightsInPagina = highlights.filter(h => h.pagina === pageNumber);
  
  const colori = [
    { nome: 'Giallo', valore: '#FFEB3B' },
    { nome: 'Verde', valore: '#4CAF50' },
    { nome: 'Blu', valore: '#2196F3' },
    { nome: 'Rosa', valore: '#E91E63' },
    { nome: 'Arancione', valore: '#FF9800' }
  ];
  
  return (
    <div className={cn(
      "relative",
      isFullscreen && "fixed inset-0 z-50 bg-white"
    )}>
      
      {/* Toolbar */}
      <Card className="p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => {
                const num = parseInt(e.target.value);
                if (num >= 1 && num <= numPages) {
                  setPageNumber(num);
                }
              }}
              className="w-16 px-2 py-1 text-center border rounded"
              min={1}
              max={numPages}
            />
            <span className="text-sm text-gray-600">di {numPages}</span>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <Badge variant="outline">{Math.round(scale * 100)}%</Badge>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.min(2.0, scale + 0.1))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {highlightsInPagina.length} highlights
          </Badge>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant={isManualMode ? "default" : "outline"}
            onClick={() => {
              if (!isManualMode) {
                toast({
                  title: "Modalità Manuale Attiva",
                  description: "Disegna un rettangolo per evidenziare. Utile per immagini o scansioni senza testo selezionabile.",
                  duration: 4000
                });
              }
              setIsManualMode(!isManualMode);
            }}
            title="Evidenziatore Manuale (per scansioni/immagini)"
          >
            <Highlighter className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = pdfData.pdfUrl; // 🆕 Usa pdfUrl dalla query lazy
              link.download = 'capitolo.pdf';
              link.click();
            }}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </Card>
      
      {/* PDF Container */}
      <div className="relative">
        <div
          className="border rounded-lg overflow-auto bg-gray-100"
          style={{
            maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '600px'
          }}
          onMouseUp={handleTextSelection}
        >
          <Document
            file={pdfData.pdfUrl} // 🆕 Usa pdfUrl dalla query lazy
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Caricamento PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96">
                <div className="text-center text-red-600">
                  <p className="mb-2">❌ Errore caricamento PDF</p>
                  <p className="text-sm">Verifica che il file sia valido</p>
                </div>
              </div>
            }
          >
            <div className="relative inline-block" ref={pdfWrapperRef}>
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={!isManualMode} // Disabilita selezione testo in manual mode
                renderAnnotationLayer={true}
              />
              
              {/* Overlay Manual Mode */}
              {isManualMode && (
                <div
                  className="absolute inset-0 z-50 cursor-crosshair"
                  onMouseDown={handleManualMouseDown}
                  onMouseMove={handleManualMouseMove}
                  onMouseUp={handleManualMouseUp}
                  onMouseLeave={handleManualMouseUp}
                >
                  {currentDragRect && (
                    <div
                      className="absolute border-2 border-yellow-500 bg-yellow-200/30"
                      style={{
                        left: currentDragRect.x,
                        top: currentDragRect.y,
                        width: currentDragRect.width,
                        height: currentDragRect.height,
                      }}
                    />
                  )}
                </div>
              )}

              {/* Overlay Highlights */}
              {highlightsInPagina.map((highlight) => (
                <div key={highlight.id}>
                  <div
                    className="absolute z-10 cursor-pointer hover:opacity-80 transition-opacity group"
                    title="Clicca per gestire o eliminare"
                  style={{
                    left: `${highlight.posizione.x * scale}px`,
                    top: `${highlight.posizione.y * scale}px`,
                    width: `${highlight.posizione.width * scale}px`,
                    height: `${highlight.posizione.height * scale}px`,
                    backgroundColor: highlight.colore,
                    opacity: 0.4,
                    pointerEvents: 'auto'
                  }}
                  onClick={() => setSelectedHighlight(
                    selectedHighlight === highlight.id ? null : highlight.id
                  )}
                >
                  {/* Highlight Overlay - always visible but transparent */}
                </div>
                
                {/* Popup Menu - separate from highlight div to avoid click issues */}
                {selectedHighlight === highlight.id && (
                  <div 
                    className="absolute z-50 bg-white p-3 rounded-lg shadow-xl border border-gray-200 min-w-[200px] max-w-[300px]"
                    style={{
                      left: `${highlight.posizione.x * scale}px`,
                      top: `${(highlight.posizione.y + highlight.posizione.height) * scale + 10}px`,
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popup
                  >
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium line-clamp-3 flex-1 mr-2 select-text">
                          {highlight.testo}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                            title="Copia testo"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(highlight.testo);
                                toast({ title: "Copiato", description: "Testo copiato negli appunti" });
                              } catch (e) {
                                toast({ title: "Errore", description: "Impossibile copiare", variant: "destructive" });
                              }
                            }}
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                            onClick={() => setSelectedHighlight(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {highlight.nota && (
                        <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded select-text">
                          {highlight.nota}
                        </p>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full justify-center h-8 text-xs"
                        onClick={() => {
                          if (window.confirm('Eliminare questo highlight?')) {
                            onHighlightRemove(highlight.id);
                            setSelectedHighlight(null);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Elimina
                      </Button>
                  </div>
                )}
                </div>
              ))}
            </div>
          </Document>
        </div>
      </div>
      
      {/* Modal Nuovo Highlight */}
      {showHighlightModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Highlighter className="w-5 h-5 text-yellow-600" />
                Nuovo Highlight
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowHighlightModal(false);
                  setSelectedText('');
                  setHighlightNota('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Testo selezionato (Editabile) */}
            <div className="bg-gray-50 p-3 rounded mb-4">
              <div className="flex justify-between items-center gap-2 mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Testo Evidenziato
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyText}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                  title="Copia testo negli appunti"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              
              <Textarea
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                className="min-h-[80px] text-sm bg-white border-gray-200 focus-visible:ring-1"
                placeholder={isManualMode 
                  ? "Hai evidenziato un'area grafica (immagine/scansione). Digita qui il testo manualmente o aggiungi una nota."
                  : "Il testo evidenziato apparirà qui."
                }
                autoFocus={isManualMode} // Focus automatico se manuale
              />
            </div>
            
            {/* Scelta colore */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Colore highlight:
              </label>
              <div className="flex gap-2">
                {colori.map((col) => (
                  <button
                    key={col.valore}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      highlightColor === col.valore
                        ? "border-gray-900 scale-110"
                        : "border-gray-300"
                    )}
                    style={{ backgroundColor: col.valore }}
                    onClick={() => setHighlightColor(col.valore)}
                    title={col.nome}
                  />
                ))}
              </div>
            </div>
            
            {/* Nota opzionale */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Nota (opzionale):
              </label>
              <Textarea
                placeholder="Aggiungi una nota a questo highlight..."
                value={highlightNota}
                onChange={(e) => setHighlightNota(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Azioni */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHighlightModal(false);
                  setSelectedText('');
                  setHighlightNota('');
                  setIsManualMode(false);
                }}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={salvaHighlight}
                className="flex-1"
              >
                Salva Highlight
              </Button>
            </div>
          </Card>
        </div>
      )}
      
    </div>
  );
}