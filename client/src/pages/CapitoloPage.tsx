import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, CheckSquare, 
  Plus, Trash2, Save, FileText, Upload, Maximize2, Minimize2, Settings 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RecitePhase from '@/components/sq3r/RecitePhase';
import ReviewPhase from '@/components/sq3r/ReviewPhase';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PDFViewerWithHighlights } from "@/components/sq3r/PDFViewerWithHighlights";
import { PDFUploader } from "@/components/sq3r/PDFUploader";

interface Highlight {
  id: string;
  pagina: number;
  testo: string;
  nota?: string;
  colore: string;
  posizione: { x: number; y: number; width: number; height: number; };
  timestamp: string;
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
  surveyChecklist?: {
    titoli: boolean;
    grassetti: boolean;
    schemi: boolean;
    sommario: boolean;
  };
  surveyConcettiChiave?: string[];
  surveyDurata?: number;
  domande?: Array<{
    domanda: string;
    risposta?: string;
    datoManuale: boolean;
  }>;
  // PDF fields
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: number;
  pdfNumPages?: number;
  readHighlights?: Highlight[];
  // New fields
  reciteData?: {
     tempoSecondi: number;
     valutazione: number;
     noteRiflessione: string;
     concettiDaRivedere: string[];
     completatoAt: Date;
  } | string;
  reviewData?: any;
}

export default function CapitoloPage({ params }: { params: { concorsoId: string; id: string } }) {
  const { concorsoId, id: capitoloId } = params;
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query dettagli capitolo
  const { data: capitolo, isLoading, error } = useQuery<Capitolo>({
    queryKey: ['capitolo', capitoloId],
    queryFn: async () => {
      console.log('🔄 Caricamento capitolo...'); 
      const startTime = performance.now(); 

      const res = await fetch(`/api/sq3r/capitoli/${capitoloId}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        // Logga il corpo dell'errore per debug
        const errorText = await res.text();
        console.error('❌ Errore API capitolo:', res.status, errorText);
        throw new Error(`Errore caricamento capitolo: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json(); 
     
      const duration = performance.now() - startTime; 
      console.log(`✅ Capitolo caricato in ${duration.toFixed(0)}ms`); 

      return data;
    },
    staleTime: 30000, 
    gcTime: 5 * 60 * 1000, 
    retry: 1, // Riduci retry per debug
  });

  // Survey State
  const [checklist, setChecklist] = useState({
    titoli: false,
    grassetti: false,
    schemi: false,
    sommario: false
  });
  const [concettiChiave, setConcettiChiave] = useState<string[]>([]);
  const [nuovoConcetto, setNuovoConcetto] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Question State
  const [domande, setDomande] = useState<Array<{ domanda: string; risposta?: string; datoManuale: boolean }>>([]);
  const [nuovaDomanda, setNuovaDomanda] = useState("");
  
  // PDF State
  const [showPdf, setShowPdf] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Tab State
  const [currentTab, setCurrentTab] = useState("survey");

  // Inizializza stato quando i dati sono caricati
  useEffect(() => {
    if (capitolo) {
      console.log('🔄 Capitolo aggiornato:', { 
        id: capitolo.id, 
        faseCorrente: capitolo.faseCorrente, 
        hasReviewData: !!capitolo.reviewData,
        reviewDataType: typeof capitolo.reviewData
      });

      // Sync tab with current phase
      if (capitolo.faseCorrente) {
         const targetTab = capitolo.faseCorrente === 'completed' ? 'review' : capitolo.faseCorrente;
         console.log('📑 Setting tab to:', targetTab);
         setCurrentTab(targetTab);
      }
      if (capitolo.surveyChecklist) setChecklist(capitolo.surveyChecklist);
      if (capitolo.surveyConcettiChiave) setConcettiChiave(capitolo.surveyConcettiChiave);
      if (capitolo.surveyDurata) setTimerSeconds(capitolo.surveyDurata);
      if (capitolo.domande) setDomande(capitolo.domande);
      // Auto-open PDF if available
      if (capitolo.pdfFileName && !showPdf) {
        setShowPdf(true);
      }
    }
  }, [capitolo]);

  // Monitoraggio performance
  useEffect(() => { 
    if (capitolo) { 
      // const loadTime = performance.now() - navigationStart; // navigationStart non accessibile direttamente qui, usiamo approssimazione
      console.log(`📊 Dati capitolo pronti`); 
      
      if (capitolo.pdfFileName) { 
        console.log(`📄 PDF presente: ${capitolo.pdfFileName} (${(capitolo.pdfFileSize ? capitolo.pdfFileSize / 1024 / 1024 : 0).toFixed(2)}MB)`); 
      } 
    } 
  }, [capitolo]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddConcetto = () => {
    if (nuovoConcetto.trim()) {
      setConcettiChiave([...concettiChiave, nuovoConcetto.trim()]);
      setNuovoConcetto("");
    }
  };

  const removeConcetto = (index: number) => {
    setConcettiChiave(concettiChiave.filter((_, i) => i !== index));
  };

  // Mutation per salvare Highlights
  const updateHighlightsMutation = useMutation({
    mutationFn: async (highlights: Highlight[]) => {
      const res = await apiRequest("PATCH", `/api/sq3r/capitoli/${capitoloId}`, {
        readHighlights: highlights
      });
      return res.json();
    },
    onMutate: async (newHighlights) => {
      await queryClient.cancelQueries({ queryKey: ['capitolo', capitoloId] });
      const previousCapitolo = queryClient.getQueryData<Capitolo>(['capitolo', capitoloId]);
      
      if (previousCapitolo) {
        queryClient.setQueryData<Capitolo>(['capitolo', capitoloId], {
          ...previousCapitolo,
          readHighlights: newHighlights
        });
      }
      return { previousCapitolo };
    },
    onError: (err, newHighlights, context) => {
      if (context?.previousCapitolo) {
        queryClient.setQueryData(['capitolo', capitoloId], context.previousCapitolo);
      }
      toast({ 
        title: "Errore salvataggio highlights", 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
    },
    onSuccess: () => {
      // toast({ title: "Highlights salvati" }); // Opzionale: Rimuovere per meno rumore
    }
  });

  const handleHighlightAdd = (h: Omit<Highlight, 'id' | 'timestamp'>) => {
    const newHighlight: Highlight = {
      ...h,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    const currentHighlights = capitolo?.readHighlights || [];
    updateHighlightsMutation.mutate([...currentHighlights, newHighlight]);
  };

  const handleHighlightRemove = (id: string) => {
    const currentHighlights = capitolo?.readHighlights || [];
    updateHighlightsMutation.mutate(currentHighlights.filter(h => h.id !== id));
  };

  const handleClearAllHighlights = () => {
    updateHighlightsMutation.mutate([]);
  };

  const handleHighlightUpdate = (id: string, nota: string) => {
    const currentHighlights = capitolo?.readHighlights || [];
    updateHighlightsMutation.mutate(currentHighlights.map(h => 
      h.id === id ? { ...h, nota } : h
    ));
  };

  // Mutation per salvare Survey
  const updateSurveyMutation = useMutation({
    mutationFn: async (completato: boolean) => {
      const res = await apiRequest("PATCH", `/api/sq3r/capitoli/${capitoloId}`, {
        surveyChecklist: checklist,
        surveyConcettiChiave: concettiChiave,
        surveyDurata: timerSeconds,
        surveyCompletato: completato,
        faseCorrente: completato ? 'question' : 'survey'
      });
      return res.json();
    },
    onSuccess: (_, completato) => {
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
      if (completato) {
        setIsTimerRunning(false);
        toast({
          title: "Fase Survey Completata!",
          description: "Ottimo lavoro! Passa alla fase Question.",
        });
      } else {
        toast({
          title: "Progressi salvati",
          description: "I dati della fase Survey sono stati salvati.",
        });
      }
    },
    onError: (error) => {
      console.error("Errore salvataggio survey:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare i progressi.",
        variant: "destructive"
      });
    }
  });

  const handleSaveSurvey = (completato: boolean = false) => {
    updateSurveyMutation.mutate(completato);
  };

  const handleAddDomanda = () => {
    if (nuovaDomanda.trim()) {
      setDomande([...domande, { domanda: nuovaDomanda.trim(), datoManuale: true }]);
      setNuovaDomanda("");
    }
  };

  const removeDomanda = (index: number) => {
    setDomande(domande.filter((_, i) => i !== index));
  };

  // Mutation per salvare Question
  const updateQuestionMutation = useMutation({
    mutationFn: async (completato: boolean) => {
      const res = await apiRequest("PATCH", `/api/sq3r/capitoli/${capitoloId}`, {
        domande: domande,
        questionCompletato: completato,
        faseCorrente: completato ? 'read' : 'question'
      });
      return res.json();
    },
    onSuccess: (_, completato) => {
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
      if (completato) {
        toast({
          title: "Fase Question Completata!",
          description: "Ottimo! Ora leggi il testo per rispondere alle domande.",
        });
      } else {
        toast({
          title: "Domande salvate",
          description: "Le domande sono state salvate.",
        });
      }
    },
    onError: (error) => {
      console.error("Errore salvataggio question:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le domande.",
        variant: "destructive"
      });
    }
  });

  const handleSaveQuestion = (completato: boolean = false) => {
    updateQuestionMutation.mutate(completato);
  };

  const handleUpdateRisposta = (index: number, risposta: string) => {
    const newDomande = [...domande];
    newDomande[index].risposta = risposta;
    setDomande(newDomande);
  };

  const [visibleAnswers, setVisibleAnswers] = useState<Record<number, boolean>>({});

  const toggleAnswerVisibility = (index: number) => {
    setVisibleAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Mutation per salvare Read
  const updateReadMutation = useMutation({
    mutationFn: async (completato: boolean) => {
      const res = await apiRequest("PATCH", `/api/sq3r/capitoli/${capitoloId}`, {
        domande: domande,
        readCompletato: completato,
        faseCorrente: completato ? 'recite' : 'read'
      });
      return res.json();
    },
    onSuccess: (_, completato) => {
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
      if (completato) {
        toast({
          title: "Fase Read Completata!",
          description: "Ottimo! Ora passa alla fase Recite per ripetere.",
        });
      } else {
        toast({
          title: "Risposte salvate",
          description: "Le tue risposte sono state salvate.",
        });
      }
    },
    onError: (error) => {
      console.error("Errore salvataggio read:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le risposte.",
        variant: "destructive"
      });
    }
  });

  const handleSaveRead = (completato: boolean = false) => {
    updateReadMutation.mutate(completato);
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Errore caricamento</h2>
        <p className="text-gray-600 my-4">{(error as Error).message}</p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            Riprova
          </Button>
          <Button onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)}>
            Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6"> 
        <div className="flex items-center justify-center min-h-[400px]"> 
          <div className="text-center space-y-4"> 
            <Clock className="h-12 w-12 animate-spin text-primary mx-auto" /> 
            <div> 
              <p className="font-medium">Caricamento capitolo...</p> 
              <p className="text-sm text-muted-foreground">Un attimo di pazienza</p> 
            </div> 
          </div> 
        </div> 
      </div> 
    );
  }

  if (!capitolo) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Capitolo non trovato</h2>
        <Button onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)} className="mt-4">
          Torna indietro
        </Button>
      </div>
    );
  }

  const SQ3RContent = (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-8">
        <TabsTrigger value="survey" className="gap-2">
          {capitolo.surveyCompletato ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
          1. Survey
        </TabsTrigger>
        <TabsTrigger value="question" className="gap-2">
          {capitolo.questionCompletato ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
          2. Question
        </TabsTrigger>
        <TabsTrigger value="read" className="gap-2">
          {capitolo.readCompletato ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
          3. Read
        </TabsTrigger>
        <TabsTrigger value="recite" className="gap-2">
          {capitolo.reciteCompletato ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
          4. Recite
        </TabsTrigger>
        <TabsTrigger value="review" className="gap-2">
          {capitolo.reviewCompletato ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4" />}
          5. Review
        </TabsTrigger>
      </TabsList>

      <TabsContent value="survey" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna Sinistra: Istruzioni e Timer */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Obiettivo
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Scansiona rapidamente il capitolo per cogliere la struttura e i concetti chiave. 
                Non leggere tutto, concentrati su titoli, grassetti e immagini.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                <div className="text-3xl font-mono font-bold text-blue-900 mb-2">
                  {formatTime(timerSeconds)}
                </div>
                <Button 
                  variant={isTimerRunning ? "destructive" : "default"} 
                  size="sm" 
                  onClick={toggleTimer}
                  className="w-full"
                >
                  {isTimerRunning ? "Pausa" : "Avvia Timer"}
                </Button>
              </div>
            </Card>

            {/* Upload PDF nel Survey se non presente */}
            {!capitolo.pdfFileName && (
              <Card className="p-6 border-dashed border-2">
                 <div className="text-center">
                    <p className="mb-4 text-sm text-gray-500">
                      Non hai ancora caricato il PDF di questo capitolo.
                      Caricalo ora per poterlo visualizzare durante lo studio.
                    </p>
                    <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Carica PDF Capitolo
                    </Button>
                 </div>
              </Card>
            )}
          </div>

          {/* Colonna Centrale e Destra: Attività */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                Checklist di Scansione
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="titoli" 
                    checked={checklist.titoli}
                    onCheckedChange={(c) => setChecklist(prev => ({ ...prev, titoli: !!c }))}
                  />
                  <Label htmlFor="titoli">Ho letto il titolo e l'introduzione</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="grassetti" 
                    checked={checklist.grassetti}
                    onCheckedChange={(c) => setChecklist(prev => ({ ...prev, grassetti: !!c }))}
                  />
                  <Label htmlFor="grassetti">Ho scorso i titoli dei paragrafi e le parole in grassetto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="schemi" 
                    checked={checklist.schemi}
                    onCheckedChange={(c) => setChecklist(prev => ({ ...prev, schemi: !!c }))}
                  />
                  <Label htmlFor="schemi">Ho guardato le immagini, i grafici e gli schemi</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sommario" 
                    checked={checklist.sommario}
                    onCheckedChange={(c) => setChecklist(prev => ({ ...prev, sommario: !!c }))}
                  />
                  <Label htmlFor="sommario">Ho letto il riassunto finale (se presente)</Label>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Concetti Chiave Attesi
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Cosa pensi di imparare da questo capitolo? Scrivi alcune parole chiave.
              </p>
              
              <div className="flex gap-2 mb-4">
                <Input 
                  placeholder="Nuovo concetto..." 
                  value={nuovoConcetto}
                  onChange={(e) => setNuovoConcetto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddConcetto()}
                />
                <Button onClick={handleAddConcetto} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {concettiChiave.map((concetto, idx) => (
                  <div key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {concetto}
                    <button onClick={() => removeConcetto(idx)} className="hover:text-purple-900">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {concettiChiave.length === 0 && (
                  <span className="text-gray-400 text-sm italic">Nessun concetto aggiunto</span>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleSaveSurvey(false)}>
                <Save className="w-4 h-4 mr-2" />
                Salva Progressi
              </Button>
              <Button 
                onClick={() => handleSaveSurvey(true)}
                disabled={!checklist.titoli && !checklist.grassetti} // Richiede almeno un minimo di attività
                className="bg-green-600 hover:bg-green-700"
              >
                Completa Fase Survey
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="question">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna Sinistra: Istruzioni */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Obiettivo
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Trasforma i titoli e i sottotitoli in domande attive. 
                Questo guiderà la tua lettura e ti aiuterà a mantenere la concentrazione.
              </p>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                <strong>Esempio:</strong><br/>
                Titolo: "Le cause della Prima Guerra Mondiale"<br/>
                Domanda: "Quali furono le cause principali della Prima Guerra Mondiale?"
              </div>
            </Card>
          </div>

          {/* Colonna Centrale e Destra: Domande */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Le tue Domande Guida
              </h3>
              
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="Scrivi una domanda..." 
                  value={nuovaDomanda}
                  onChange={(e) => setNuovaDomanda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomanda()}
                />
                <Button onClick={handleAddDomanda}>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi
                </Button>
              </div>

              <div className="space-y-3">
                {domande.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-800 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{item.domanda}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-red-600"
                      onClick={() => removeDomanda(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {domande.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                    <p>Nessuna domanda aggiunta ancora.</p>
                    <p className="text-sm">Inizia trasformando il primo titolo del capitolo in una domanda.</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleSaveQuestion(false)}>
                <Save className="w-4 h-4 mr-2" />
                Salva Domande
              </Button>
              <Button 
                onClick={() => handleSaveQuestion(true)}
                disabled={domande.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Completa Fase Question
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="read">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna Sinistra: Istruzioni */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Obiettivo
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Leggi attivamente il testo per trovare le risposte alle domande che hai formulato. 
                Non leggere passivamente: cerca le informazioni!
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <strong>Suggerimento:</strong><br/>
                Concentrati su una domanda alla volta. Leggi il paragrafo corrispondente e scrivi la risposta con parole tue.
              </div>
            </Card>
          </div>

          {/* Colonna Centrale e Destra: Risposte */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Rispondi alle tue Domande
              </h3>
              
              <div className="space-y-6">
                {domande.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <Label className="text-base font-medium flex gap-2">
                      <span className="bg-blue-100 text-blue-800 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      {item.domanda}
                    </Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Scrivi qui la risposta..."
                      value={item.risposta || ""}
                      onChange={(e) => handleUpdateRisposta(idx, e.target.value)}
                    />
                  </div>
                ))}
                {domande.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                    <p>Non hai ancora creato domande.</p>
                    <p className="text-sm">Torna alla fase "Question" per aggiungere delle domande guida.</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleSaveRead(false)}>
                <Save className="w-4 h-4 mr-2" />
                Salva Risposte
              </Button>
              <Button 
                onClick={() => handleSaveRead(true)}
                disabled={domande.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Completa Fase Read
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="recite">
        <RecitePhase 
          capitolo={capitolo}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
            // Lo stato faseCorrente viene aggiornato dalla mutation in RecitePhase
          }}
        />
      </TabsContent>

      <TabsContent value="review">
        <ReviewPhase 
          capitolo={capitolo}
          onComplete={() => {
             // Redirezione gestita all'interno di ReviewPhase o qui
             setLocation(`/concorsi/${concorsoId}/fase1`);
          }}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>Capitolo {capitolo.numeroCapitolo}</span>
              <span>•</span>
              <span className="uppercase tracking-wider font-medium text-blue-600">
                Fase: {capitolo.faseCorrente}
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate max-w-md md:max-w-xl">
              {capitolo.titolo}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PDF Toggle */}
          <Button 
            variant={showPdf ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowPdf(!showPdf)}
            disabled={!capitolo.pdfFileName} // Usa pdfFileName invece di pdfUrl
            title={!capitolo.pdfFileName ? "Nessun PDF caricato" : showPdf ? "Nascondi PDF" : "Mostra PDF"}
          >
            <FileText className="w-4 h-4 mr-2" />
            {showPdf ? "Nascondi PDF" : "PDF"}
          </Button>

          {/* PDF Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Gestione PDF Capitolo</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <PDFUploader 
                  capitoloId={capitoloId}
                  pdfUrl={capitolo.pdfUrl} // Questo potrebbe essere undefined ora, ma va bene per l'uploader se serve solo a mostrare preview esistente (che non c'è)
                  pdfFileName={capitolo.pdfFileName}
                  pdfFileSize={capitolo.pdfFileSize}
                  onUploadSuccess={(data) => {
                    queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
                    setIsUploadDialogOpen(false);
                    setShowPdf(true); // Auto-open after upload
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area - Split View */}
      <div className="flex-1 overflow-hidden">
        {showPdf && capitolo.pdfFileName ? ( // Usa pdfFileName invece di pdfUrl
          <ResizablePanelGroup direction="horizontal" className="h-full items-stretch">
            {/* Left: PDF Viewer */}
            <ResizablePanel defaultSize={40} minSize={20} className="bg-gray-100 border-r">
              <div className="h-full overflow-hidden flex flex-col">
                <div className="p-2 border-b bg-white flex justify-between items-center">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documento
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowPdf(false)}>
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                   <PDFViewerWithHighlights 
                      capitoloId={capitoloId} // 🆕 Passa ID invece di URL (che ora è undefined)
                      highlights={capitolo.readHighlights || []}
                      onHighlightAdd={handleHighlightAdd}
                      onHighlightRemove={handleHighlightRemove}
                      onHighlightUpdate={handleHighlightUpdate}
                      onClearAll={handleClearAllHighlights}
                   />
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle />

            {/* Right: SQ3R App */}
            <ResizablePanel defaultSize={60} minSize={30} className="bg-gray-50">
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  {SQ3RContent}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          /* Full Width Layout */
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              {SQ3RContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
