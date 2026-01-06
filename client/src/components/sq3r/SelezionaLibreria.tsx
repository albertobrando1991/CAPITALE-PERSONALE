import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Book, Plus, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { materieEnum } from '@shared/schema-libreria';

interface SelezionaLibreriaProps {
  concorsoId?: string;
  onFonteAggiunta?: () => void;
  onDocumentSelect?: (doc: Documento) => void;
  mode?: 'add-source' | 'select';
}

interface Documento {
  id: string;
  titolo: string;
  descrizione?: string;
  materia: string;
  fileName: string;
  fileSize: number;
  numPages?: number;
  downloadsCount: number;
  pdfUrl?: string;
  pdfBase64?: string;
}

export default function SelezionaLibreria({ 
  concorsoId, 
  onFonteAggiunta, 
  onDocumentSelect,
  mode = 'add-source'
}: SelezionaLibreriaProps) {
  const [materiaFilter, setMateriaFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aggiuntiIds, setAggiuntiIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch documenti
  const { data: documenti = [], isLoading } = useQuery<Documento[]>({
    queryKey: ['libreria-documenti', materiaFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (materiaFilter) params.append('materia', materiaFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/libreria/documenti?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Errore caricamento documenti');
      return res.json();
    },
  });

  // Aggiungi fonte
  const aggiungiFonteMutation = useMutation({
    mutationFn: async (documentoId: string) => {
      const res = await fetch('/api/sq3r/fonti/da-libreria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          concorsoId,
          documentoLibreriaId: documentoId,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore aggiunta fonte');
      }
      
      return res.json();
    },
    onSuccess: (_, documentoId) => {
      toast({
        title: "Successo",
        description: 'Documento aggiunto alla Fase 0!'
      });
      setAggiuntiIds(prev => new Set(prev).add(documentoId));
      queryClient.invalidateQueries({ queryKey: ['sq3r-fonti'] });
      onFonteAggiunta?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {mode === 'add-source' && (
        <div>
          <h3 className="text-lg font-semibold mb-2">📚 Dalla Libreria Pubblica</h3>
          <p className="text-sm text-muted-foreground">
            Seleziona documenti dalla libreria e aggiungili come fonti di studio
          </p>
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca documento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={materiaFilter}
          onChange={(e) => setMateriaFilter(e.target.value)}
          className="px-4 py-2 border rounded-md min-w-[200px]"
        >
          <option value="">Tutte le materie</option>
          {materieEnum.map(materia => (
            <option key={materia} value={materia}>{materia}</option>
          ))}
        </select>
      </div>

      {/* Lista Documenti */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Caricamento...</p>
        </div>
      ) : documenti.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Book className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun documento trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
          {documenti.map(doc => {
            const isAggiunto = aggiuntiIds.has(doc.id);
            
            return (
              <Card key={doc.id} className={`hover:shadow-md transition-shadow ${isAggiunto ? 'border-green-500 bg-green-50' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-start justify-between">
                    <span className="line-clamp-1">{doc.titolo}</span>
                    {isAggiunto && (
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {doc.descrizione || 'Nessuna descrizione'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {doc.materia}
                  </Badge>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📄 {formatFileSize(doc.fileSize)}</div>
                    {doc.numPages && <div>📖 {doc.numPages} pagine</div>}
                  </div>

                  <Button
                    size="sm"
                    variant={isAggiunto ? "outline" : "default"}
                    className="w-full"
                    onClick={async () => {
                      if (mode === 'select' && onDocumentSelect) {
                        try {
                          const res = await fetch(`/api/libreria/documenti/${doc.id}`);
                          if (!res.ok) throw new Error('Errore recupero dettagli');
                          const fullDoc = await res.json();
                          
                          let pdfUrl = fullDoc.pdfUrl;
                          if (fullDoc.pdfBase64 && !pdfUrl) {
                            pdfUrl = `data:application/pdf;base64,${fullDoc.pdfBase64}`;
                          }
                          
                          onDocumentSelect({
                            ...doc,
                            pdfUrl
                          });
                        } catch (e) {
                          toast({
                            title: "Errore",
                            description: "Errore nel recupero del PDF",
                            variant: "destructive"
                          });
                        }
                      } else if (concorsoId) {
                        aggiungiFonteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={mode === 'add-source' && (aggiungiFonteMutation.isPending || isAggiunto)}
                  >
                    {mode === 'select' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Seleziona
                      </>
                    ) : isAggiunto ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Aggiunto
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi a Fase 0
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}