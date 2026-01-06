import { useState, useEffect } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { Book, Download, Plus, Search, Filter, Upload, ExternalLink, Gavel, Folder, ArrowLeft, Calendar } from 'lucide-react'; 
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; 
import { Badge } from '@/components/ui/badge'; 
import { useToast } from "@/hooks/use-toast";
import { materieEnum } from '@shared/schema-libreria'; 
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Documento { 
  id: string; 
  titolo: string; 
  descrizione?: string; 
  materia: string; 
  tags?: string[]; 
  fileName: string; 
  fileSize: number; 
  numPages?: number; 
  downloadsCount: number; 
  hasPdf: boolean; 
  createdAt: string; 
} 

interface Norma { 
  id: string; 
  urn: string; 
  tipo: string; 
  numero?: string; 
  anno: number; 
  data?: string; 
  titolo: string; 
  titoloBreve?: string; 
  keywords?: string[]; 
  urlNormattiva: string; 
  gazzettaUfficiale?: string; 
} 

export default function LibreriaPubblicaPage() { 
  const [location] = useLocation();
  // Parse query params manually since wouter doesn't provide a hook for it
  const getSearchParams = () => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  };
  const searchParams = getSearchParams();
  const initialTab = searchParams.get('tab') || 'normativa';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [materiaFilter, setMateriaFilter] = useState<string>(''); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [normativaSearch, setNormativaSearch] = useState('');
  const [debouncedNormativaQuery, setDebouncedNormativaQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Upload State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadMateria, setUploadMateria] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const queryClient = useQueryClient(); 
  const { toast } = useToast(); 

  // Sync activeTab with URL if needed, or just handle initial load
  useEffect(() => {
    const params = getSearchParams();
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Optional: update URL
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };

  // Debounce search for Normativa
  const handleNormativaSearch = (value: string) => { 
    setNormativaSearch(value); 
    const timer = setTimeout(() => setDebouncedNormativaQuery(value), 500); 
    return () => clearTimeout(timer); 
  }; 

  // Fetch documenti 
  const { data: documenti = [], isLoading } = useQuery<Documento[]>({ 
    queryKey: ['libreria-documenti', materiaFilter, searchQuery, selectedFolder], 
    queryFn: async () => { 
      const params = new URLSearchParams(); 
      // Se abbiamo selezionato una cartella, usiamola come filtro materia
      if (selectedFolder) params.append('materia', selectedFolder);
      // Altrimenti se c'è un filtro manuale
      else if (materiaFilter) params.append('materia', materiaFilter);
      
      if (searchQuery) params.append('search', searchQuery); 
      
      const res = await fetch(`/api/libreria/documenti?${params}`, { 
        credentials: 'include', 
      }); 
      
      if (!res.ok) throw new Error('Errore caricamento documenti'); 
      return res.json(); 
    }, 
  }); 

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("Seleziona un file PDF");
      if (!uploadTitle) throw new Error("Inserisci un titolo");
      if (!uploadMateria) throw new Error("Seleziona una materia");

      const formData = new FormData();
      formData.append('pdf', uploadFile);
      formData.append('titolo', uploadTitle);
      formData.append('descrizione', uploadDesc);
      formData.append('materia', uploadMateria);
      // tags defaults to empty array if not sent, handle in backend if needed or send JSON
      
      const res = await fetch('/api/libreria/documenti', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore durante l\'upload');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Documento caricato con successo!' });
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDesc('');
      setUploadFile(null);
      // Se eravamo in una cartella, rimaniamo lì, la query si aggiorna
      queryClient.invalidateQueries({ queryKey: ['libreria-documenti'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore Upload', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  }); 

  // Fetch Normativa (Real API)
  const { data: normative = [], isLoading: isLoadingNormative } = useQuery<Norma[]>({
    queryKey: ['norme-search', debouncedNormativaQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedNormativaQuery) params.append('q', debouncedNormativaQuery);
      params.append('limit', '50');
      
      const res = await fetch(`/api/norme/search?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Errore caricamento normativa');
      return res.json();
    },
    enabled: true // Always load initial list
  });

  // Download documento 
  const downloadMutation = useMutation({ 
    mutationFn: async (docId: string) => { 
      await fetch(`/api/libreria/documenti/${docId}/download`, { 
        method: 'POST', 
        credentials: 'include', 
      }); 
      
      const res = await fetch(`/api/libreria/documenti/${docId}`, { 
        credentials: 'include', 
      }); 
      
      if (!res.ok) throw new Error('Errore download'); 
      
      const doc = await res.json(); 
      
      if (doc.pdfBase64) { 
        const link = document.createElement('a'); 
        link.href = `data:application/pdf;base64,${doc.pdfBase64}`; 
        link.download = doc.fileName; 
        link.click(); 
      } else if (doc.pdfUrl) {
        window.open(doc.pdfUrl, '_blank');
      }
      
      return docId; 
    }, 
    onSuccess: () => { 
      toast({
        title: 'Download completato!',
        description: 'Il file è stato scaricato correttamente.',
      }); 
      queryClient.invalidateQueries({ queryKey: ['libreria-documenti'] }); 
    }, 
    onError: () => { 
      toast({
        title: 'Errore',
        description: 'Errore durante il download del documento.',
        variant: 'destructive',
      }); 
    }, 
  }); 

  const formatFileSize = (bytes: number) => { 
    if (bytes < 1024) return `${bytes} B`; 
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; 
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; 
  }; 

  return ( 
    <div className="container mx-auto p-6 max-w-7xl"> 
      {/* Header */} 
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"> 
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"> 
            <Book className="h-8 w-8 text-primary" /> 
            Libreria Pubblica 
          </h1> 
          <p className="text-muted-foreground"> 
            Materiali di studio condivisi e Normativa ufficiale
          </p> 
        </div>

        {/* Upload Button Global */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Upload className="h-4 w-4 mr-2" />
              Carica Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Carica Nuovo Documento</DialogTitle>
              <DialogDescription>
                Condividi un documento PDF con la community. Sarà visibile a tutti nella sezione corretta.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="titolo">Titolo</Label>
                <Input 
                  id="titolo" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Es. Riassunto Diritto Amministrativo" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descrizione">Descrizione (opzionale)</Label>
                <Textarea 
                  id="descrizione" 
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Breve descrizione del contenuto..." 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="materia">Materia / Cartella</Label>
                <Select 
                  value={uploadMateria} 
                  onValueChange={setUploadMateria}
                  defaultValue={selectedFolder || undefined} // Pre-select if inside folder
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {materieEnum.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file">File PDF</Label>
                <Input 
                  id="file" 
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Annulla</Button>
              <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Caricamento..." : "Carica"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div> 

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="normativa">Cerca Normativa</TabsTrigger>
          <TabsTrigger value="documenti">Documenti Condivisi</TabsTrigger>
        </TabsList>

        {/* TAB NORMATIVA */}
        <TabsContent value="normativa">
           <div className="space-y-6">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Cerca normativa (es. 'privacy', '196/2003', 'costituzione')..." 
                 value={normativaSearch}
                 onChange={(e) => handleNormativaSearch(e.target.value)}
                 className="pl-10 py-6 text-lg"
               />
             </div>

             {/* Disclaimer User-Centric */}
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
                <Gavel className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Accesso Diretto alla Fonte Ufficiale</p>
                  <p>
                    Cerca la norma che ti interessa e scarica il testo vigente direttamente da <strong>Normattiva.it</strong>.
                    Nessuna registrazione, nessun costo, sempre aggiornato.
                  </p>
                </div>
             </div>

             {isLoadingNormative ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-muted-foreground">Ricerca normativa in corso...</p>
                </div>
             ) : normative.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-muted-foreground">Nessuna normativa trovata. Prova a cercare qualcosa di specifico.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 gap-4">
                  {normative.map((norma, idx) => (
                    <Card key={norma.id || norma.urn || idx} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-600">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">{norma.tipo}</Badge>
                                {norma.numero && <Badge variant="outline">n. {norma.numero}</Badge>}
                                <Badge variant="outline">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {norma.anno}
                                </Badge>
                            </div>
                            <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
                              {norma.titoloBreve || norma.titolo}
                            </CardTitle>
                            <CardDescription className="mt-2 text-base text-foreground/90 font-medium">
                              {norma.titolo}
                            </CardDescription>
                            
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex flex-wrap gap-2">
                             {norma.keywords?.map((k, idx) => <Badge key={`${k}-${idx}`} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">#{k}</Badge>)}
                          </div>
                          
                          <Button 
                            variant="default" 
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                            onClick={() => window.open(norma.urlNormattiva, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Scarica Testo Vigente
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Link diretto a: <span className="underline">Normattiva.it</span> (Sito Ufficiale)
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
             )}
           </div>
        </TabsContent>

        {/* TAB DOCUMENTI CONDIVISI (Cartelle) */}
        <TabsContent value="documenti">
          <div className="space-y-6">
            
            {/* Navigazione Cartelle */}
            {!selectedFolder ? (
              // VISTA CARTELLE
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {materieEnum.map(materia => (
                   <Card 
                    key={materia} 
                    className="hover:shadow-md cursor-pointer transition-all hover:bg-blue-50/50 border-blue-100"
                    onClick={() => {
                      setSelectedFolder(materia);
                      setUploadMateria(materia); // Pre-fill upload
                    }}
                   >
                     <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                       <Folder className="h-16 w-16 text-blue-300 fill-blue-100" />
                       <h3 className="font-semibold text-foreground">{materia}</h3>
                       {/* Qui potremmo mostrare il count dei file se lo avessimo dal backend */}
                     </CardContent>
                   </Card>
                 ))}
              </div>
            ) : (
              // VISTA FILES NELLA CARTELLA
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setSelectedFolder(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Torna alle Cartelle
                  </Button>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Folder className="h-6 w-6 text-blue-500" />
                    {selectedFolder}
                  </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4"> 
                  <div className="flex-1 relative"> 
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> 
                    <Input 
                      placeholder={`Cerca in ${selectedFolder}...`} 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="pl-10" 
                    /> 
                  </div> 
                </div> 

                {/* Lista Documenti */} 
                {isLoading ? ( 
                  <div className="text-center py-12"> 
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" /> 
                    <p className="mt-4 text-muted-foreground">Caricamento...</p> 
                  </div> 
                ) : documenti.length === 0 ? ( 
                  <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed"> 
                    <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" /> 
                    <p className="text-muted-foreground">Questa cartella è vuota.</p> 
                    <Button 
                      variant="link" 
                      onClick={() => setIsUploadOpen(true)}
                      className="mt-2 text-primary"
                      >
                      Carica il primo documento
                    </Button>
                  </div> 
                ) : ( 
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> 
                    {documenti.map((doc, idx) => ( 
                      <Card key={doc.id || idx} className="hover:shadow-lg transition-shadow"> 
                        <CardHeader> 
                          <CardTitle className="text-lg flex items-start gap-2">
                            <span className="line-clamp-1">{doc.titolo}</span>
                          </CardTitle> 
                          <CardDescription className="line-clamp-2"> 
                            {doc.descrizione || 'Nessuna descrizione'} 
                          </CardDescription> 
                        </CardHeader> 
                        <CardContent> 
                          <div className="space-y-3"> 
                            <div className="text-sm text-muted-foreground space-y-1"> 
                              <div>📄 {formatFileSize(doc.fileSize)}</div> 
                              {doc.numPages && <div>📖 {doc.numPages} pagine</div>} 
                              <div>⬇️ {doc.downloadsCount} download</div> 
                            </div> 

                            <div className="flex gap-2"> 
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="flex-1" 
                                onClick={() => downloadMutation.mutate(doc.id)} 
                                disabled={downloadMutation.isPending} 
                              > 
                                <Download className="h-4 w-4 mr-2" /> 
                                Scarica 
                              </Button> 
                            </div> 
                          </div> 
                        </CardContent> 
                      </Card> 
                    ))} 
                  </div> 
                )} 
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div> 
  ); 
}