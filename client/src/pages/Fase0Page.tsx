import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  BookOpen,
  FileText,
  Upload,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SelezionaLibreria from '@/components/sq3r/SelezionaLibreria';
import { apiRequest } from '@/lib/queryClient';

interface Fonte {
  id: string;
  tipo: 'edises' | 'personale' | 'notebooklm';
  titolo: string;
  autore?: string;
  materia?: string;
  createdAt: string;
}

interface Materia {
  id: string;
  nomeMateria: string;
  colore: string;
  icona?: string;
  capitoliTotali: number;
  capitoliCompletati: number;
  oreStudioTotali: number;
  fonteId?: string;
}

interface Capitolo {
  id: string;
  numeroCapitolo: number;
  titolo: string;
  surveyCompletato: boolean;
  questionCompletato: boolean;
  readCompletato: boolean;
  reciteCompletato: boolean;
  reviewCompletato: boolean;
  completato: boolean;
  faseCorrente: string;
}

export default function Fase0Page({ params }: { params: { concorsoId: string } }) {
  const { concorsoId } = params;
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [showAddMateria, setShowAddMateria] = useState(false);
  const [materiaSelezionata, setMateriaSelezionata] = useState<string | null>(null);

  // Form states per nuova materia
  const [newMateriaName, setNewMateriaName] = useState("");
  const [newMateriaColor, setNewMateriaColor] = useState("#3B82F6"); // Blue default
  const [newMateriaIcon, setNewMateriaIcon] = useState("📖");

  // Form states per nuovo capitolo
  const [showAddCapitolo, setShowAddCapitolo] = useState(false);
  const [newCapitoloTitle, setNewCapitoloTitle] = useState("");
  const [newCapitoloNumber, setNewCapitoloNumber] = useState(1);
  const [newCapitoloStartPage, setNewCapitoloStartPage] = useState("");
  const [newCapitoloEndPage, setNewCapitoloEndPage] = useState("");

  const colors = [
    { name: "Blu", value: "#3B82F6" },
    { name: "Rosso", value: "#EF4444" },
    { name: "Verde", value: "#22C55E" },
    { name: "Giallo", value: "#EAB308" },
    { name: "Viola", value: "#A855F7" },
    { name: "Rosa", value: "#EC4899" },
    { name: "Indaco", value: "#6366F1" },
    { name: "Arancione", value: "#F97316" },
  ];

  const icons = ["📖", "⚖️", "🏛️", "📝", "🧠", "💼", "📊", "🌍"];

  // Mutation per creare materia
  const createMateriaMutation = useMutation({
    mutationFn: async () => {
      // Usa apiRequest che gestisce già gli errori HTTP
      const res = await apiRequest("POST", "/api/sq3r/materie", {
        concorsoId,
        nomeMateria: newMateriaName,
        colore: newMateriaColor,
        icona: newMateriaIcon
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
      setShowAddMateria(false);
      setNewMateriaName("");
      setNewMateriaColor("#3B82F6");
      setNewMateriaIcon("📖");
      toast({
        title: "Materia creata",
        description: "La nuova materia è stata aggiunta con successo.",
      });
    },
    onError: (error) => {
      console.error("Errore creazione materia:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile creare la materia. Riprova.",
        variant: "destructive"
      });
    }
  });

  const handleCreateMateria = () => {
    if (!newMateriaName.trim()) {
      toast({
        title: "Nome mancante",
        description: "Inserisci un nome per la materia.",
        variant: "destructive"
      });
      return;
    }
    createMateriaMutation.mutate();
  };

  // Mutation per creare capitolo
  const createCapitoloMutation = useMutation({
    mutationFn: async () => {
      if (!materiaSelezionata) throw new Error("Nessuna materia selezionata");
      
      const res = await apiRequest("POST", "/api/sq3r/capitoli", {
        materiaId: materiaSelezionata,
        numeroCapitolo: Number(newCapitoloNumber),
        titolo: newCapitoloTitle,
        pagineInizio: newCapitoloStartPage ? Number(newCapitoloStartPage) : undefined,
        pagineFine: newCapitoloEndPage ? Number(newCapitoloEndPage) : undefined
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capitoli', materiaSelezionata] });
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
      setShowAddCapitolo(false);
      setNewCapitoloTitle("");
      setNewCapitoloStartPage("");
      setNewCapitoloEndPage("");
      toast({
        title: "Capitolo creato",
        description: "Il nuovo capitolo è stato aggiunto con successo.",
      });
    },
    onError: (error) => {
      console.error("Errore creazione capitolo:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile creare il capitolo.",
        variant: "destructive"
      });
    }
  });

  const handleOpenAddCapitolo = () => {
    const maxNum = capitoli.reduce((max, c) => Math.max(max, c.numeroCapitolo), 0);
    setNewCapitoloNumber(maxNum + 1);
    setShowAddCapitolo(true);
  };

  const handleCreateCapitolo = () => {
    if (!newCapitoloTitle.trim()) {
      toast({
        title: "Titolo mancante",
        description: "Inserisci un titolo per il capitolo.",
        variant: "destructive"
      });
      return;
    }
    createCapitoloMutation.mutate();
  };
  
  // Query fonti
  const { data: fonti = [], isLoading: loadingFonti } = useQuery<Fonte[]>({
    queryKey: ['fonti', concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/sq3r/fonti?concorsoId=${concorsoId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Errore caricamento fonti');
      return res.json();
    },
    enabled: !!concorsoId
  });
  
  // Query materie
  const { data: materie = [], isLoading: loadingMaterie } = useQuery<Materia[]>({
    queryKey: ['materie', concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/sq3r/materie?concorsoId=${concorsoId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Errore caricamento materie');
      return res.json();
    },
    enabled: !!concorsoId
  });
  
  // Query capitoli (per materia selezionata)
  const { data: capitoli = [] } = useQuery<Capitolo[]>({
    queryKey: ['capitoli', materiaSelezionata],
    queryFn: async () => {
      if (!materiaSelezionata) return [];
      const res = await fetch(`/api/sq3r/capitoli?materiaId=${materiaSelezionata}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Errore caricamento capitoli');
      return res.json();
    },
    enabled: !!materiaSelezionata
  });
  
  // Calcola statistiche
  const stats = {
    totalCapitoli: materie.reduce((acc, m) => acc + m.capitoliTotali, 0),
    capitoliCompletati: materie.reduce((acc, m) => acc + m.capitoliCompletati, 0),
    oreStudioTotali: Math.round(materie.reduce((acc, m) => acc + (m.oreStudioTotali || 0), 0) / 60),
    percentuale: materie.reduce((acc, m) => acc + m.capitoliTotali, 0) > 0
      ? Math.round((materie.reduce((acc, m) => acc + m.capitoliCompletati, 0) / materie.reduce((acc, m) => acc + m.capitoliTotali, 0)) * 100)
      : 0
  };
  
  const navigaACapitolo = (capitoloId: string) => {
    setLocation(`/concorsi/${concorsoId}/fase0/capitolo/${capitoloId}`);
  };
  
  const getStatoIcona = (capitolo: Capitolo) => {
    if (capitolo.completato) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    if (capitolo.surveyCompletato || capitolo.questionCompletato || capitolo.readCompletato) {
      return <Circle className="w-5 h-5 text-blue-600 fill-blue-200" />;
    }
    return <Circle className="w-5 h-5 text-gray-300" />;
  };
  
  const getProgressoFasi = (capitolo: Capitolo) => {
    let completate = 0;
    if (capitolo.surveyCompletato) completate++;
    if (capitolo.questionCompletato) completate++;
    if (capitolo.readCompletato) completate++;
    if (capitolo.reciteCompletato) completate++;
    if (capitolo.reviewCompletato) completate++;
    return { completate, totali: 5 };
  };
  
  if (loadingFonti || loadingMaterie) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Fase 0: Apprendimento Base (SQ3R)
            </h1>
            <p className="text-gray-600 mt-1">
              Costruisci le fondamenta prima di passare alle flashcard
            </p>
          </div>
          
          <Button
            onClick={() => setLocation(`/concorsi/${concorsoId}/fase2`)}
            variant="outline"
          >
            Vai a Fase 2 (Flashcard) →
          </Button>
        </div>

        {/* Spiegazione Metodo SQ3R */}
        <Card className="p-0 overflow-hidden border-primary/20 bg-primary/5">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="info-sq3r" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">Come funziona la Fase 0?</h3>
                    <p className="text-sm text-primary/80 font-normal">Scopri gli obiettivi e il metodo SQ3R per uno studio efficace.</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-foreground">
                      <Target className="w-4 h-4 text-primary" />
                      Obiettivi di questa fase
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">•</span>
                        <span>Costruire una <strong>comprensione profonda</strong> del materiale prima di memorizzare.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">•</span>
                        <span>Trasformare la lettura passiva in <strong>apprendimento attivo</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-secondary mt-1">•</span>
                        <span>Creare una base solida per la successiva creazione di <strong>Flashcard</strong>.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-foreground">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Il Metodo SQ3R in 5 Step
                    </h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-primary bg-primary/10 px-2 rounded">S</span>
                        <div><strong>Survey (Scansione):</strong> Guarda titoli, immagini e grassetti per avere una panoramica.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-primary bg-primary/10 px-2 rounded">Q</span>
                        <div><strong>Question (Domande):</strong> Trasforma i titoli in domande guida.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-primary bg-primary/10 px-2 rounded">R</span>
                        <div><strong>Read (Lettura):</strong> Leggi attivamente per rispondere alle domande.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-primary bg-primary/10 px-2 rounded">R</span>
                        <div><strong>Recite (Ripetizione):</strong> Ripeti i concetti a voce alta senza guardare.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-primary bg-primary/10 px-2 rounded">R</span>
                        <div><strong>Review (Revisione):</strong> Rivedi tutto per consolidare il ricordo.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Sezione Setup Fonti */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📤 Aggiungi Fonti di Studio</CardTitle>
            <CardDescription>
              Carica i tuoi materiali o scegli dalla libreria pubblica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">📤 Carica File</TabsTrigger>
                <TabsTrigger value="libreria">📚 Dalla Libreria</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                {/* Componente upload esistente (placeholder) */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">
                    Carica qui i tuoi file PDF (Manuali, Dispense, ecc.)
                  </p>
                  <Button className="mt-4" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Seleziona File
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="libreria" className="mt-4">
                <SelezionaLibreria
                  concorsoId={concorsoId!}
                  onFonteAggiunta={() => {
                    // Ricarica fonti
                    queryClient.invalidateQueries({ queryKey: ['fonti', concorsoId] });
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Statistiche Generali */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Progresso</p>
                <p className="text-2xl font-bold text-gray-900">{stats.percentuale}%</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Capitoli</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.capitoliCompletati}/{stats.totalCapitoli}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Ore Studio</p>
                <p className="text-2xl font-bold text-gray-900">{stats.oreStudioTotali}h</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Materie</p>
                <p className="text-2xl font-bold text-gray-900">{materie.length}</p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Barra Progresso Generale */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Progresso Generale</h3>
            <span className="text-sm text-gray-600">
              {stats.capitoliCompletati} di {stats.totalCapitoli} capitoli completati
            </span>
          </div>
          <Progress value={stats.percentuale} className="h-3" />
        </Card>
        
        {/* Onboarding se non ci sono materie */}
        {materie.length === 0 && (
          <Card className="p-8 text-center border-2 border-dashed">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Inizia il tuo apprendimento</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Aggiungi le materie da studiare per iniziare il metodo SQ3R.
              Puoi caricare manuali, dispense o creare materiali con AI.
            </p>
            <Button
              size="lg"
              onClick={() => setShowAddMateria(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Aggiungi Prima Materia
            </Button>
          </Card>
        )}
        
        {/* Lista Materie */}
        {materie.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Le Tue Materie</h2>
              <Button onClick={() => setShowAddMateria(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Materia
              </Button>
            </div>
            
            <div className="space-y-4">
              {materie.map((materia) => {
                const percentuale = materia.capitoliTotali > 0
                  ? Math.round((materia.capitoliCompletati / materia.capitoliTotali) * 100)
                  : 0;
                
                const isExpanded = materiaSelezionata === materia.id;
                
                return (
                  <Card key={materia.id} className="overflow-hidden">
                    {/* Header Materia */}
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setMateriaSelezionata(isExpanded ? null : materia.id)}
                      style={{ borderLeft: `4px solid ${materia.colore}` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{materia.icona || '📖'}</span>
                            <div>
                              <h3 className="text-xl font-semibold">{materia.nomeMateria}</h3>
                              <p className="text-sm text-gray-600">
                                {materia.capitoliCompletati}/{materia.capitoliTotali} capitoli completati
                              </p>
                            </div>
                          </div>
                          
                          <Progress value={percentuale} className="h-2" />
                        </div>
                        
                        <div className="flex items-center gap-4 ml-6">
                          <div className="text-right">
                            <p className="text-3xl font-bold text-gray-900">{percentuale}%</p>
                            <p className="text-xs text-gray-500">completato</p>
                          </div>
                          
                          <ChevronRight
                            className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Lista Capitoli (espansa) */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-6">
                        {capitoli.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600 mb-4">
                              Nessun capitolo ancora. Inizia aggiungendo i capitoli da studiare.
                            </p>
                            <Button
                              onClick={handleOpenAddCapitolo}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Aggiungi Capitolo
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {capitoli.map((capitolo) => {
                              const progresso = getProgressoFasi(capitolo);
                              
                              return (
                                <div
                                  key={capitolo.id}
                                  className="flex items-center gap-4 p-4 bg-white rounded-lg hover:shadow-md transition-shadow cursor-pointer border"
                                  onClick={() => navigaACapitolo(capitolo.id)}
                                >
                                  {/* Icona stato */}
                                  {getStatoIcona(capitolo)}
                                  
                                  {/* Numero e Titolo */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline">
                                        Cap. {capitolo.numeroCapitolo}
                                      </Badge>
                                      <h4 className="font-medium">{capitolo.titolo}</h4>
                                    </div>
                                    
                                    {/* Progresso fasi */}
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <span>{progresso.completate}/5 fasi</span>
                                      <span>•</span>
                                      <span className="text-blue-600 font-medium">
                                        {capitolo.faseCorrente === 'survey' && 'Survey'}
                                        {capitolo.faseCorrente === 'question' && 'Question'}
                                        {capitolo.faseCorrente === 'read' && 'Read'}
                                        {capitolo.faseCorrente === 'recite' && 'Recite'}
                                        {capitolo.faseCorrente === 'review' && 'Review'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Badge stato */}
                                  {capitolo.completato ? (
                                    <Badge className="bg-green-100 text-green-700">
                                      Completato
                                    </Badge>
                                  ) : progresso.completate > 0 ? (
                                    <Badge className="bg-blue-100 text-blue-700">
                                      In Corso
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      Da Iniziare
                                    </Badge>
                                  )}
                                  
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {capitoli.length > 0 && (
                          <div className="mt-4 flex justify-end">
                            <Button size="sm" onClick={handleOpenAddCapitolo}>
                              <Plus className="w-4 h-4 mr-2" />
                              Aggiungi Capitolo
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Modale Aggiungi Materia */}
        <Dialog open={showAddMateria} onOpenChange={setShowAddMateria}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aggiungi Materia</DialogTitle>
              <DialogDescription>
                Crea una nuova materia per organizzare il tuo studio SQ3R.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Materia</Label>
                <Input
                  id="nome"
                  placeholder="Es. Diritto Costituzionale"
                  value={newMateriaName}
                  onChange={(e) => setNewMateriaName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colore</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newMateriaColor === c.value ? 'border-black scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setNewMateriaColor(c.value)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Icona</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {icons.map((icon) => (
                      <button
                        key={icon}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border transition-all ${
                          newMateriaIcon === icon 
                            ? 'border-blue-500 bg-blue-50 text-xl' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setNewMateriaIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMateria(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateMateria} disabled={createMateriaMutation.isPending}>
                {createMateriaMutation.isPending ? "Salvataggio..." : "Crea Materia"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modale Aggiungi Capitolo */}
        <Dialog open={showAddCapitolo} onOpenChange={setShowAddCapitolo}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Aggiungi Capitolo</DialogTitle>
              <DialogDescription>
                Aggiungi un nuovo capitolo alla materia selezionata.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="num">N°</Label>
                  <Input
                    id="num"
                    type="number"
                    min="1"
                    value={newCapitoloNumber}
                    onChange={(e) => setNewCapitoloNumber(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="titolo">Titolo Capitolo</Label>
                  <Input
                    id="titolo"
                    placeholder="Es. Le fonti del diritto"
                    value={newCapitoloTitle}
                    onChange={(e) => setNewCapitoloTitle(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pgInizio">Pagina Inizio (opz)</Label>
                  <Input
                    id="pgInizio"
                    type="number"
                    placeholder="Es. 10"
                    value={newCapitoloStartPage}
                    onChange={(e) => setNewCapitoloStartPage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pgFine">Pagina Fine (opz)</Label>
                  <Input
                    id="pgFine"
                    type="number"
                    placeholder="Es. 25"
                    value={newCapitoloEndPage}
                    onChange={(e) => setNewCapitoloEndPage(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCapitolo(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateCapitolo} disabled={createCapitoloMutation.isPending}>
                {createCapitoloMutation.isPending ? "Salvataggio..." : "Crea Capitolo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </div>
  );
}
