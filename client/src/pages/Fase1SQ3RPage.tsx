import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Target,
  ArrowLeft,
  Trash2
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SelezionaLibreria from "@/components/sq3r/SelezionaLibreria";
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

export default function Fase1SQ3RPage({ params }: { params: { concorsoId: string } }) {
  const { concorsoId } = params;
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [showAddMateria, setShowAddMateria] = useState(false);
  const [materiaSelezionata, setMateriaSelezionata] = useState<string | null>(null);
  
  // State per conferma eliminazione
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'materia' | 'capitolo';
    id: string;
    title?: string;
  } | null>(null);

  // Form states per nuova materia
  const [newMateriaName, setNewMateriaName] = useState("");
  const [newMateriaColor, setNewMateriaColor] = useState("#3B82F6"); // Blue default
  const [newMateriaIcon, setNewMateriaIcon] = useState("📖");
  const [selectedMateriaSource, setSelectedMateriaSource] = useState<{
    id: string;
    titolo: string;
    fileName: string;
  } | null>(null);

  // Form states per nuovo capitolo
  const [showAddCapitolo, setShowAddCapitolo] = useState(false);
  const [newCapitoloTitle, setNewCapitoloTitle] = useState("");
  const [newCapitoloNumber, setNewCapitoloNumber] = useState(1);
  const [newCapitoloStartPage, setNewCapitoloStartPage] = useState("");
  const [newCapitoloEndPage, setNewCapitoloEndPage] = useState("");
  const [selectedPdf, setSelectedPdf] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    numPages?: number;
  } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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
      let fonteId = undefined;

      // Se c'è una fonte selezionata, creala prima
      if (selectedMateriaSource) {
        const resFonte = await apiRequest("POST", "/api/sq3r/fonti/da-libreria", {
          concorsoId,
          documentoLibreriaId: selectedMateriaSource.id
        });
        const fonte = await resFonte.json();
        fonteId = fonte.id;
      }

      // Usa apiRequest che gestisce già gli errori HTTP
      const res = await apiRequest("POST", "/api/sq3r/materie", {
        concorsoId,
        nomeMateria: newMateriaName,
        colore: newMateriaColor,
        icona: newMateriaIcon,
        fonteId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
      setShowAddMateria(false);
      setNewMateriaName("");
      setNewMateriaColor("#3B82F6");
      setNewMateriaIcon("📖");
      setSelectedMateriaSource(null);
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
    mutationFn: async (data: {
      materiaId: string;
      numeroCapitolo: number;
      titolo: string;
      pagineInizio?: string;
      pagineFine?: string;
    }) => {
      const startTime = performance.now();
      const { materiaId, numeroCapitolo, titolo, pagineInizio, pagineFine } = data;
      
      const capitoloData = {
        materiaId,
        numeroCapitolo,
        titolo,
        pagineInizio: pagineInizio ? Number(pagineInizio) : undefined,
        pagineFine: pagineFine ? Number(pagineFine) : undefined,
      };

      console.log("🚀 Creazione capitolo...", capitoloData);
      const res = await apiRequest("POST", "/api/sq3r/capitoli", capitoloData);
      const newCapitolo = await res.json();
      
      const endTime = performance.now();
      console.log(`⏱️ CREATE capitolo completo: ${(endTime - startTime).toFixed(0)}ms`);
      return newCapitolo;
    },
    
    // 🆕 OPTIMISTIC UPDATE
    onMutate: async (newCapitolo) => {
      await queryClient.cancelQueries({ queryKey: ['capitoli', newCapitolo.materiaId] });

      const previousCapitoli = queryClient.getQueryData(['capitoli', newCapitolo.materiaId]);

      // Crea ID temporaneo
      const tempId = `temp-${Date.now()}`;
      const optimisticCapitolo = {
        id: tempId,
        numeroCapitolo: newCapitolo.numeroCapitolo,
        titolo: newCapitolo.titolo,
        surveyCompletato: false,
        questionCompletato: false,
        readCompletato: false,
        reciteCompletato: false,
        reviewCompletato: false,
        completato: false,
        faseCorrente: 'survey'
      };

      // Aggiungi ottimisticamente
      queryClient.setQueryData(['capitoli', newCapitolo.materiaId], (old: Capitolo[]) => 
        old ? [...old, optimisticCapitolo] : [optimisticCapitolo]
      );

      // Aggiorna contatore materia ottimisticamente
      queryClient.setQueryData(['materie', concorsoId], (old: Materia[]) => 
        old 
          ? old.map((m) => 
              m.id === newCapitolo.materiaId 
                ? { ...m, capitoliTotali: (m.capitoliTotali || 0) + 1 } 
                : m 
            ) 
          : old
      );

      setShowAddCapitolo(false);
      setNewCapitoloTitle("");
      setNewCapitoloStartPage("");
      setNewCapitoloEndPage("");
      
      toast({
        title: "Creazione in corso...",
        description: "Stiamo creando il capitolo.",
      });

      return { previousCapitoli };
    },

    onError: (err, variables, context) => {
      console.error("Errore creazione capitolo:", err);
      if (context?.previousCapitoli) {
        queryClient.setQueryData(['capitoli', variables.materiaId], context.previousCapitoli);
      }
      toast({
        title: "Errore",
        description: err instanceof Error ? err.message : "Impossibile creare il capitolo.",
        variant: "destructive"
      });
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capitoli', variables.materiaId] });
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
      
      if (!error) {
        toast({
            title: "Capitolo creato",
            description: "Il nuovo capitolo è pronto. Puoi aggiungere il PDF aprendolo.",
        });
      }
    }
  });

  const handleOpenAddCapitolo = () => {
    const maxNum = capitoli.reduce((max, c) => Math.max(max, c.numeroCapitolo), 0);
    setNewCapitoloNumber(maxNum + 1);
    setShowAddCapitolo(true);
  };

  const handleCreateCapitolo = async () => {
    if (!newCapitoloTitle.trim()) {
      toast({
        title: "Titolo mancante",
        description: "Inserisci un titolo per il capitolo.",
        variant: "destructive"
      });
      return;
    }

    if (!materiaSelezionata) {
      toast({
        title: "Errore",
        description: "Nessuna materia selezionata.",
        variant: "destructive"
      });
      return;
    }

    createCapitoloMutation.mutate({
      materiaId: materiaSelezionata,
      numeroCapitolo: Number(newCapitoloNumber),
      titolo: newCapitoloTitle,
      pagineInizio: newCapitoloStartPage,
      pagineFine: newCapitoloEndPage,
    });
  };

  // Mutation per eliminare materia
  const deleteMateriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const startTime = performance.now();
      const res = await apiRequest("DELETE", `/api/sq3r/materie/${id}`);
      const endTime = performance.now();
      console.log(`⏱️ DELETE materia: ${(endTime - startTime).toFixed(0)}ms`);
      
      if (!res.ok) throw new Error("Errore eliminazione materia");
      return res.json();
    },
    
    // 🆕 OPTIMISTIC UPDATE
    onMutate: async (materiaId) => {
      // Cancella refetch in corso
      await queryClient.cancelQueries({ queryKey: ['materie', concorsoId] });

      // Snapshot dello stato precedente
      const previousMaterie = queryClient.getQueryData(['materie', concorsoId]);

      // Aggiorna ottimisticamente
      queryClient.setQueryData(['materie', concorsoId], (old: Materia[]) => 
        old ? old.filter((m) => m.id !== materiaId) : []
      );

      setMateriaSelezionata(null);
      toast({
        title: "Materia eliminata",
        description: "La materia è stata rimossa con successo.",
      });

      // Ritorna context per rollback
      return { previousMaterie };
    },

    // Se fallisce, rollback
    onError: (err, materiaId, context) => {
      if (context?.previousMaterie) {
        queryClient.setQueryData(['materie', concorsoId], context.previousMaterie);
      }
      toast({
        title: "Errore",
        description: "Impossibile eliminare la materia.",
        variant: "destructive"
      });
    },

    // Refetch finale per sincronizzare
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
    }
  });

  const handleDeleteMateria = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ type: 'materia', id });
  };

  // Mutation per eliminare capitolo
  const deleteCapitoloMutation = useMutation({
    mutationFn: async (id: string) => {
      const startTime = performance.now();
      const res = await apiRequest("DELETE", `/api/sq3r/capitoli/${id}`);
      const endTime = performance.now();
      console.log(`⏱️ DELETE capitolo: ${(endTime - startTime).toFixed(0)}ms`);
      
      if (!res.ok) throw new Error("Errore eliminazione capitolo");
      return res.json();
    },
    
    // 🆕 OPTIMISTIC UPDATE
    onMutate: async (capitoloId) => {
      // Ottieni l'ID della materia dal contesto (se disponibile) o trovalo
      // Qui assumiamo che materiaSelezionata sia ancora valido
      const currentMateriaId = materiaSelezionata;
      
      if (currentMateriaId) {
        await queryClient.cancelQueries({ queryKey: ['capitoli', currentMateriaId] });
        
        const previousCapitoli = queryClient.getQueryData(['capitoli', currentMateriaId]);
        
        // Rimuovi ottimisticamente
        queryClient.setQueryData(['capitoli', currentMateriaId], (old: Capitolo[]) => 
          old ? old.filter(c => c.id !== capitoloId) : []
        );
        
        // Aggiorna contatore materia ottimisticamente
        queryClient.setQueryData(['materie', concorsoId], (old: Materia[]) => 
          old 
            ? old.map((m) => 
                m.id === currentMateriaId 
                  ? { ...m, capitoliTotali: Math.max(0, (m.capitoliTotali || 0) - 1) } 
                  : m 
              ) 
            : old
        );
        
        return { previousCapitoli, currentMateriaId };
      }
    },

    onError: (err, capitoloId, context) => {
      if (context?.previousCapitoli && context?.currentMateriaId) {
        queryClient.setQueryData(['capitoli', context.currentMateriaId], context.previousCapitoli);
      }
      toast({
        title: "Errore",
        description: "Impossibile eliminare il capitolo.",
        variant: "destructive"
      });
    },

    onSettled: (data, error, variables, context) => {
      if (context?.currentMateriaId) {
        queryClient.invalidateQueries({ queryKey: ['capitoli', context.currentMateriaId] });
      }
      queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] });
      
      toast({
        title: "Capitolo eliminato",
        description: "Il capitolo è stato rimosso con successo.",
      });
    }
  });

  const handleDeleteCapitolo = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ type: 'capitolo', id });
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
    enabled: !!concorsoId,
    staleTime: 0, // 🆕 Forza refetch sempre
    refetchOnWindowFocus: true, // 🆕 Refetch quando torni sulla pagina
    refetchInterval: 5000, // 🆕 Refetch ogni 5 secondi (opzionale)
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
    enabled: !!materiaSelezionata,
    staleTime: 0,
    refetchOnWindowFocus: true,
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
    setLocation(`/concorsi/${concorsoId}/fase1/capitolo/${capitoloId}`);
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
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 pl-0 text-muted-foreground hover:text-foreground"
                onClick={() => setLocation(`/concorsi/${concorsoId}/fase0`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Torna a Fase 0
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Fase 1: Apprendimento Base (SQ3R)
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
        <Card className="p-0 overflow-hidden border-blue-100 bg-blue-50/50 mb-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="info-sq3r" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Come funziona la Fase 1?</h3>
                    <p className="text-sm text-blue-700 font-normal">Scopri gli obiettivi e il metodo SQ3R per uno studio efficace.</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-gray-900">
                      <Target className="w-4 h-4 text-blue-600" />
                      Obiettivi di questa fase
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>Costruire una <strong>comprensione profonda</strong> del materiale prima di memorizzare.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>Trasformare la lettura passiva in <strong>apprendimento attivo</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>Creare una base solida per la successiva creazione di <strong>Flashcard</strong>.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 text-gray-900">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Il Metodo SQ3R in 5 Step
                    </h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 rounded">S</span>
                        <div><strong>Survey (Scansione):</strong> Guarda titoli, immagini e grassetti per avere una panoramica.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 rounded">Q</span>
                        <div><strong>Question (Domande):</strong> Trasforma i titoli in domande guida.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 rounded">R</span>
                        <div><strong>Read (Lettura):</strong> Leggi attivamente per rispondere alle domande.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 rounded">R</span>
                        <div><strong>Recite (Ripetizione):</strong> Ripeti i concetti a voce alta senza guardare.</div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="font-bold text-blue-700 bg-blue-100 px-2 rounded">R</span>
                        <div><strong>Review (Revisione):</strong> Rivedi tutto per consolidare il ricordo.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
                            
                            {/* Pulsante di debug per ricalcolo (visibile solo se necessario o per dev) */}
                            {/* 
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-1 h-6 text-xs text-blue-500" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/sq3r/materie/${materia.id}/ricalcola`, { 
                                  method: 'POST', 
                                  credentials: 'include', 
                                }); 
                                queryClient.invalidateQueries({ queryKey: ['materie', concorsoId] }); 
                                toast({ title: 'Contatori ricalcolati' }); 
                              }} 
                            > 
                              🔄 Ricalcola 
                            </Button>
                            */}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => handleDeleteMateria(e, materia.id)}
                            title="Elimina materia"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>

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
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => handleDeleteCapitolo(e, capitolo.id)}
                                    title="Elimina capitolo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>

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

              <div className="space-y-2">
                <Label>Fonte (Opzionale)</Label>
                <Tabs defaultValue="manuale" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manuale">Manuale</TabsTrigger>
                    <TabsTrigger value="libreria">Da Libreria</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manuale" className="p-4 border rounded-md bg-muted/20 text-center text-sm text-muted-foreground">
                    Nessuna fonte specifica selezionata dalla libreria.
                  </TabsContent>

                  <TabsContent value="libreria" className="p-4 border rounded-md">
                    <SelezionaLibreria 
                      mode="select"
                      onDocumentSelect={(doc) => {
                        setSelectedMateriaSource({
                          id: doc.id,
                          titolo: doc.titolo,
                          fileName: doc.fileName
                        });
                        // Auto-fill name if empty
                        if (!newMateriaName) {
                          setNewMateriaName(doc.materia || doc.titolo);
                        }
                        toast({
                          title: "Documento selezionato",
                          description: `Hai selezionato: ${doc.titolo}`
                        });
                      }}
                    />
                  </TabsContent>
                </Tabs>
                
                {selectedMateriaSource && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2 text-sm text-blue-700">
                    <BookOpen className="h-4 w-4" />
                    <span>Fonte selezionata: <strong>{selectedMateriaSource.titolo}</strong></span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 ml-auto hover:bg-blue-100"
                      onClick={() => setSelectedMateriaSource(null)}
                    >
                      X
                    </Button>
                  </div>
                )}
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
          <DialogContent className="sm:max-w-2xl">
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

              <div className="p-4 border rounded-md bg-blue-50 text-sm text-blue-700">
                 <p className="flex items-center gap-2">
                   <Upload className="w-4 h-4" />
                   <strong>Nota:</strong> Potrai caricare il PDF del capitolo dopo averlo creato, aprendo la pagina di dettaglio.
                 </p>
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

        {/* Dialog Conferma Eliminazione */}
        <AlertDialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. 
                {deleteConfirmation?.type === 'materia' 
                  ? "Verrà eliminata la materia e tutti i capitoli associati."
                  : "Verrà eliminato il capitolo e tutti i progressi associati."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                onClick={() => {
                  if (deleteConfirmation?.type === 'materia') {
                    deleteMateriaMutation.mutate(deleteConfirmation.id);
                  } else if (deleteConfirmation?.type === 'capitolo') {
                    deleteCapitoloMutation.mutate(deleteConfirmation.id);
                  }
                  setDeleteConfirmation(null);
                }}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
      </div>
    </div>
  );
}