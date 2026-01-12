import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/Flashcard";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Layers, X, Loader2, Play, RotateCcw, RefreshCw } from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Flashcard as FlashcardType } from "@shared/schema";
import { SpiegazioneModal } from "@/components/SpiegazioneModal";

interface SessionProgress {
  currentIndex: number;
  completedIds: string[];
  totalCards: number;
  savedAt: number;
}

interface StudiedFlashcard {
  id: string;
  risultato: 'facile' | 'nonRicordo';
}

function mapFlashcardForDisplay(card: FlashcardType) {
  let status: "new" | "easy" | "hard" = "new";
  
  // Determina lo stato
  if ((card.tentativiTotali || 0) > 0) {
    if (card.livelloSRS !== null && card.livelloSRS >= 3) {
      status = "easy";
    } else {
      status = "hard";
    }
  }

  const tags: string[] = [];
  if (card.materia) tags.push(card.materia);
  if (card.tipo && card.tipo !== "concetto") tags.push(card.tipo);

  return {
    id: card.id,
    front: card.fronte,
    back: card.retro,
    tags,
    status,
    source: card.fonte || undefined,
    prossimoRipasso: card.prossimoRipasso || null,
    numeroRipetizioni: card.numeroRipetizioni || null,
  };
}

export default function FlashcardsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const concorsoId = params.get("concorsoId");
  
  const { data: flashcardsRaw = [], isLoading, refetch } = useQuery<FlashcardType[]>({
    queryKey: ["/api/flashcards", concorsoId || undefined],
    queryFn: async () => {
      const url = concorsoId ? `/api/flashcards?concorsoId=${concorsoId}` : "/api/flashcards";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch flashcards");
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  // Force refetch on mount to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  const { data: savedProgress, isLoading: isLoadingSession } = useQuery<SessionProgress | null>({
    queryKey: ["/api/flashcard-session"],
  });

  const saveSessionMutation = useMutation({
    mutationFn: (data: SessionProgress) => apiRequest("/api/flashcard-session", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/flashcard-session"] }),
  });

  const clearSessionMutation = useMutation({
    mutationFn: () => apiRequest("/api/flashcard-session", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/flashcard-session"] }),
  });

  const flashcards = flashcardsRaw.map(mapFlashcardForDisplay);
  
  // Filtra flashcard da studiare: mai studiate o da rivedere oggi
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  const flashcardsDaStudiare = flashcardsRaw.filter(f => {
    // Mai studiate (tentativiTotali === 0 o null/undefined)
    const tentativiTotali = f.tentativiTotali || 0;
    if (tentativiTotali === 0) {
      // Flashcard mai studiate: sempre incluse
      return true;
    }
    
    // Da rivedere (prossimoRipasso <= oggi) - solo per flashcard già studiate
    if (f.prossimoRipasso) {
      try {
        const dataRipasso = new Date(f.prossimoRipasso);
        dataRipasso.setHours(0, 0, 0, 0);
        return dataRipasso <= oggi;
      } catch (e) {
        console.error("Errore nel parsing della data prossimoRipasso:", f.prossimoRipasso, e);
        return false;
      }
    }
    // Se non ha prossimoRipasso ma è già stata studiata, non includerla
    return false;
  });
  
  // Debug: log per capire cosa viene filtrato
  console.log("Flashcard da studiare:", {
    totali: flashcardsRaw.length,
    maiStudiate: flashcardsRaw.filter(f => (f.tentativiTotali || 0) === 0).length,
    daRivedereOggi: flashcardsRaw.filter(f => {
      const tentativiTotali = f.tentativiTotali || 0;
      if (tentativiTotali === 0) return false;
      if (f.prossimoRipasso) {
        try {
          const dataRipasso = new Date(f.prossimoRipasso);
          dataRipasso.setHours(0, 0, 0, 0);
          return dataRipasso <= oggi;
        } catch (e) {
          return false;
        }
      }
      return false;
    }).length,
    filtrate: flashcardsDaStudiare.length
  });
  
  const flashcardsDaStudiareMapped = flashcardsDaStudiare.map(mapFlashcardForDisplay);
  
  // Debug: verifica il mapping
  console.log("Flashcard mappate:", {
    daStudiare: flashcardsDaStudiare.length,
    mappate: flashcardsDaStudiareMapped.length,
    primaFlashcard: flashcardsDaStudiareMapped[0] ? {
      id: flashcardsDaStudiareMapped[0].id,
      front: flashcardsDaStudiareMapped[0].front?.substring(0, 50),
      tags: flashcardsDaStudiareMapped[0].tags
    } : null
  });

  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [flashcardStudiate, setFlashcardStudiate] = useState<StudiedFlashcard[]>([]);
  const [mostraSpiegazione, setMostraSpiegazione] = useState(false);

  // Carica stato sessione da sessionStorage
  useEffect(() => {
    if (concorsoId) {
      const saved = sessionStorage.getItem(`flashcard-session-${concorsoId}`);
      if (saved) {
        try {
          setFlashcardStudiate(JSON.parse(saved));
        } catch (e) {
          console.error("Errore parsing sessione salvata", e);
        }
      }
    }
  }, [concorsoId]);

  // Salva stato sessione in sessionStorage
  useEffect(() => {
    if (concorsoId) {
      sessionStorage.setItem(
        `flashcard-session-${concorsoId}`,
        JSON.stringify(flashcardStudiate)
      );
    }
  }, [flashcardStudiate, concorsoId]);

  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ id, livelloSRS }: { id: string; livelloSRS: 0 | 3 }) => {
      return apiRequest("PATCH", `/api/flashcards/${id}`, { livelloSRS });
    },
    onSuccess: () => {
      // Invalida tutte le query relative alle flashcard per aggiornare i widget
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      if (concorsoId) {
        queryClient.invalidateQueries({ queryKey: ["/api/flashcards", concorsoId] });
      }
      queryClient.invalidateQueries({ queryKey: ["flashcards"] }); // Per il widget ProssimeRevisioniWidget
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
    },
  });

  const handleResponse = async (id: string, response: "easy" | "hard" | "forgot") => {
    // Mappa la risposta stringa (dal componente Flashcard) a livelloSRS numerico (per il backend)
    // "easy" -> 3 (Facile)
    // "forgot" -> 0 (Non Ricordo)
    // "hard" -> 0 (Trattiamo come Non Ricordo per sicurezza, o potremmo usare 1/2 se supportato)
    const livelloSRS = response === "easy" ? 3 : 0;
    
    console.log("Response for", id, ":", response, "-> livelloSRS:", livelloSRS);
    
    // Aggiorna stato locale
    setFlashcardStudiate(prev => {
      // Rimuovi eventuali duplicati se l'utente torna indietro
      const filtered = prev.filter(f => f.id !== id);
      return [...filtered, { id, risultato: livelloSRS === 3 ? 'facile' : 'nonRicordo' }];
    });
    
    // Aggiorna la flashcard sul server (senza await per non bloccare UI)
    // Usa un try-catch per loggare errori ma non bloccare
    try {
      updateFlashcardMutation.mutate({ id, livelloSRS });
    } catch (e) {
      console.error("Errore chiamata mutation:", e);
    }
    
    const newCompletedIds = [...completedIds, id];
    setCompletedIds(newCompletedIds);
    
    if (currentIndex < flashcardsDaStudiareMapped.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      saveSessionMutation.mutate({
        currentIndex: newIndex,
        completedIds: newCompletedIds,
        totalCards: flashcardsDaStudiareMapped.length,
        savedAt: Date.now(),
      });
    } else {
      setSessionComplete(true);
      clearSessionMutation.mutate();
    }
  };

  const startStudying = (fromBeginning: boolean = true) => {
    // Verifica che ci siano flashcard da studiare
    if (flashcardsDaStudiareMapped.length === 0) {
      toast({
        title: "Nessuna flashcard da studiare",
        description: "Tutte le flashcard sono già state studiate o non sono ancora pronte per la revisione.",
          variant: "default",
        });
        return;
      }
    if (fromBeginning) {
      setCurrentIndex(0);
      setCompletedIds([]);
      setFlashcardStudiate([]); // Reset stato locale
      if (concorsoId) sessionStorage.removeItem(`flashcard-session-${concorsoId}`);
      clearSessionMutation.mutate();
    }
    setIsStudying(true);
    setSessionComplete(false);
  };

  const resumeStudying = () => {
    if (savedProgress && savedProgress.currentIndex < flashcardsDaStudiareMapped.length) {
      setCurrentIndex(savedProgress.currentIndex);
      setCompletedIds(savedProgress.completedIds);
      setIsStudying(true);
      setSessionComplete(false);
    } else {
      startStudying(true);
    }
  };

  const stopStudying = async () => {
    if (completedIds.length > 0 && currentIndex < flashcardsDaStudiareMapped.length) {
      saveSessionMutation.mutate({
        currentIndex,
        completedIds,
        totalCards: flashcardsDaStudiareMapped.length,
        savedAt: Date.now(),
      });
    }
    setIsStudying(false);
    setSessionComplete(false);
    
    // Invalida le query per ricaricare i dati aggiornati nella lista
    await queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
    if (concorsoId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/flashcards", concorsoId] });
    }
    
    // Torna a Fase 2 se c'è concorsoId, altrimenti alla dashboard
    if (concorsoId) {
      setLocation(`/concorsi/${concorsoId}/fase2`);
    } else {
      setLocation("/dashboard");
    }
  };

  const discardProgress = () => {
    clearSessionMutation.mutate();
  };

  const resetFlashcardsMutation = useMutation({
    mutationFn: async () => {
      if (!concorsoId) {
        throw new Error("ConcorsoId richiesto per resettare le flashcard");
      }
      return apiRequest("POST", "/api/flashcards/reset", { concorsoId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-session"] });
      // Reset anche lo stato locale
      setCompletedIds([]);
      setCurrentIndex(0);
      setSessionComplete(false);
      clearSessionMutation.mutate();
      toast({
        title: "Flashcard resettate",
        description: `${data.count || 0} flashcard sono state resettate. Tutti i progressi sono stati cancellati.`,
      });
    },
    onError: (error: any) => {
      console.error("Error resetting flashcards:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile resettare le flashcard",
        variant: "destructive",
      });
    },
  });

  const handleResetFlashcards = () => {
    if (!concorsoId) {
      return;
    }
    if (window.confirm("Sei sicuro di voler resettare tutte le flashcard? Tutti i progressi verranno persi e dovrai ricominciare da capo.")) {
      resetFlashcardsMutation.mutate();
    }
  };

  if (isLoading || isLoadingSession) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <EmptyState
          icon={Layers}
          title="Nessuna flashcard"
          description="Carica del materiale per generare automaticamente delle flashcard."
          actionLabel="Carica Materiale"
          onAction={() => console.log("Navigate to materials")}
        />
      </div>
    );
  }

  if (isStudying) {
    if (sessionComplete) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-500/10 rounded-full inline-block">
              <Layers className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold">Sessione Completata!</h2>
            <p className="text-muted-foreground">
              Hai completato <span className="font-bold">{completedIds.length}</span> flashcard
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => { 
                setIsStudying(false); 
                setSessionComplete(false);
                if (concorsoId) {
                  setLocation(`/concorsi/${concorsoId}/fase2`);
                } else {
                  setLocation("/dashboard");
                }
              }} data-testid="button-back-to-list">
                Torna alla Lista
              </Button>
              <Button onClick={() => startStudying(true)} data-testid="button-restart-study">
                <RotateCcw className="h-4 w-4 mr-2" />
                Ricomincia
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const progressPercent = flashcardsDaStudiareMapped.length > 0 
      ? (currentIndex / flashcardsDaStudiareMapped.length) * 100 
      : 0;

    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={stopStudying}
            data-testid="button-exit-study"
          >
            <X className="h-4 w-4 mr-2" />
            Esci e Salva
          </Button>
          <div className="flex-1 max-w-2xl mx-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {currentIndex + 1} / {flashcardsDaStudiareMapped.length}
              </span>
            </div>
            
            {/* Barra progresso colorata */}
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden flex">
              {flashcardsDaStudiareMapped.map((card, index) => {
                 const studiata = flashcardStudiate.find(f => f.id === card.id);
                 const width = (1 / flashcardsDaStudiareMapped.length) * 100;
                 
                 let bgColor = "bg-muted";
                 if (studiata?.risultato === 'facile') bgColor = "bg-green-500";
                 if (studiata?.risultato === 'nonRicordo') bgColor = "bg-destructive";
                 if (index === currentIndex) bgColor = "bg-primary/60"; // Evidenzia corrente
                 
                 return (
                   <div 
                     key={card.id} 
                     style={{ width: `${width}%` }} 
                     className={`h-full transition-all duration-300 ${bgColor}`}
                   />
                 );
               })}
            </div>
          </div>
          <div className="w-24 text-right">
            <span className="text-sm text-muted-foreground">
              {completedIds.length} completate
            </span>
          </div>
        </header>

        {/* Sidebar desktop */}
        <div className="hidden lg:block fixed right-4 top-24 w-64 bg-card border rounded-lg shadow-lg p-4 max-h-[calc(100vh-8rem)] overflow-y-auto z-10">
          <h3 className="font-semibold mb-3">Progresso Sessione</h3>
          
          <div className="space-y-2">
            {flashcardsDaStudiareMapped.map((card, index) => {
              const studiata = flashcardStudiate.find(f => f.id === card.id);
              const isCurrent = index === currentIndex;
              
              // LOGICA COLORI CORRETTA
              let statusClass = "bg-muted border-muted-foreground/30 text-muted-foreground";
              
              if (studiata) {
                if (studiata.risultato === 'facile') {
                  statusClass = "bg-green-500 border-green-500 text-white";
                } else if (studiata.risultato === 'nonRicordo') {
                  statusClass = "bg-destructive border-destructive text-white";
                }
              }
              
              if (isCurrent) statusClass += " ring-2 ring-primary";
              
              return (
                <div 
                  key={card.id} 
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${isCurrent ? 'bg-accent' : 'hover:bg-muted/50'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-semibold ${statusClass}`}>
                    {index + 1}
                  </div>
                  
                  <span className="text-xs text-foreground/80 truncate flex-1" title={card.tags[0] || "Generale"}>
                    {card.tags[0]?.substring(0, 20) || "Generale"}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div>Facili:</span>
              <span className="font-semibold">
                {flashcardStudiate.filter(f => f.risultato === 'facile').length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive"></div>Da rivedere:</span>
              <span className="font-semibold">
                {flashcardStudiate.filter(f => f.risultato === 'nonRicordo').length}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Rimanenti:</span>
              <span>
                {flashcardsDaStudiareMapped.length - flashcardStudiate.length}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile drawer (footer) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-10">
           <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
             {flashcardsDaStudiareMapped.map((card, index) => {
               const studiata = flashcardStudiate.find(f => f.id === card.id);
               const isCurrent = index === currentIndex;
               
               let statusClass = "bg-muted border-muted-foreground/30 text-muted-foreground";
               if (studiata?.risultato === 'facile') statusClass = "bg-green-500 border-green-500 text-white";
               if (studiata?.risultato === 'nonRicordo') statusClass = "bg-destructive border-destructive text-white";
               if (isCurrent && !studiata) statusClass = "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2";
               
               return (
                 <div 
                   key={card.id} 
                   className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-xs font-semibold transition-all ${statusClass}`}
                 >
                   {index + 1}
                 </div>
               );
             })}
           </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:mr-64 mb-16 lg:mb-0">
          {flashcardsDaStudiareMapped.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">Nessuna flashcard disponibile</p>
              <p className="text-sm">Totale: {flashcardsRaw.length}, Mai studiate: {flashcardsRaw.filter(f => (f.tentativiTotali || 0) === 0).length}</p>
            </div>
          ) : flashcardsDaStudiareMapped[currentIndex] ? (
            <>
              <Flashcard
                {...flashcardsDaStudiareMapped[currentIndex]}
                onResponse={handleResponse}
                onRequestExplanation={() => setMostraSpiegazione(true)}
              />
              <SpiegazioneModal
                isOpen={mostraSpiegazione}
                onClose={() => setMostraSpiegazione(false)}
                flashcardId={flashcardsDaStudiareMapped[currentIndex].id}
                domanda={flashcardsDaStudiareMapped[currentIndex].front}
                materia={flashcardsDaStudiareMapped[currentIndex].tags[0] || "Materia"}
              />
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">Errore: indice fuori range</p>
              <p className="text-sm">currentIndex: {currentIndex}, Totali: {flashcardsDaStudiareMapped.length}</p>
            </div>
          )}
        </div>

        <footer className="p-4 border-t">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Completate: <span className="font-medium text-foreground">{completedIds.length}</span></span>
            <span>Rimanenti: <span className="font-medium text-foreground">{flashcardsDaStudiareMapped.length - currentIndex}</span></span>
          </div>
        </footer>
      </div>
    );
  }

  const hasValidProgress = savedProgress && savedProgress.currentIndex < flashcardsDaStudiareMapped.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            if (concorsoId) {
              setLocation(`/concorsi/${concorsoId}/fase2`);
            } else {
              setLocation("/dashboard");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Flashcard</h1>
          <p className="text-muted-foreground mt-1">
            {flashcards.length} flashcard totali • {flashcardsDaStudiareMapped.length} da studiare
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {hasValidProgress && (
            <>
              <Button variant="outline" onClick={discardProgress} data-testid="button-discard-progress">
                Scarta Progresso
              </Button>
              <Button onClick={resumeStudying} data-testid="button-resume-study">
                <Play className="h-4 w-4 mr-2" />
                Riprendi ({savedProgress.currentIndex}/{savedProgress.totalCards})
              </Button>
            </>
          )}
          {concorsoId && flashcardsRaw.some(f => (f.tentativiTotali || 0) > 0) && (
            <Button 
              variant="outline" 
              onClick={handleResetFlashcards}
              disabled={resetFlashcardsMutation.isPending}
              data-testid="button-reset-flashcards"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {resetFlashcardsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reset Progresso
            </Button>
          )}
          <Button 
            onClick={() => startStudying(true)} 
            variant={hasValidProgress ? "outline" : "default"}
            data-testid="button-start-study"
          >
            <Layers className="h-4 w-4 mr-2" />
            {hasValidProgress ? "Ricomincia" : "Inizia Ripasso"}
          </Button>
        </div>
      </div>

      {hasValidProgress && (
        <div className="bg-muted/50 border rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Sessione in sospeso</p>
              <p className="text-sm text-muted-foreground">
                Hai completato {savedProgress.completedIds.length} flashcard su {savedProgress.totalCards}
              </p>
            </div>
            <Progress 
              value={(savedProgress.currentIndex / savedProgress.totalCards) * 100} 
              className="w-32 h-2"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcardsRaw.map((cardRaw, index) => {
          const card = flashcards[index];
          const tentativi = Number(cardRaw.tentativiTotali || 0);
          const livello = Number(cardRaw.livelloSRS || 0);
          const masterate = cardRaw.masterate === true; // Verifica boolean esplicito
          
          const isStudied = tentativi > 0;
          const isMastered = masterate; // Usa il campo masterate dal DB
          // IMPORTANTE: Una carta è "Da ripassare" (rossa) SE è stata studiata E NON è masterata
          const isNotRemembered = isStudied && !isMastered;
          const isNotStudied = !isStudied;
          
          // Determina colore bordo e background
          let borderColor = "border-gray-300 dark:border-gray-700";
          let bgColor = "bg-card";
          
          if (isMastered) {
            borderColor = "border-green-500 border-2"; // Bordo verde spesso per 'Facile'
            bgColor = "bg-green-500/10 dark:bg-green-500/20"; // Verde più intenso
          } else if (isNotRemembered) {
            borderColor = "border-destructive border-2"; // Bordo rosso spesso per 'Non Ricordo'
            bgColor = "bg-destructive/10 dark:bg-destructive/20";
          } else if (isNotStudied) {
            borderColor = "border-border";
            bgColor = "bg-card/50";
          }
          
          return (
            <div
              key={card.id}
              className={`p-4 ${bgColor} ${borderColor} rounded-lg hover-elevate cursor-pointer transition-all ${
                savedProgress?.completedIds?.includes(card.id) ? "opacity-50" : ""
              }`}
              onClick={() => {
                setCurrentIndex(index);
                setCompletedIds([]);
                setIsStudying(true);
                setSessionComplete(false);
              }}
              data-testid={`card-preview-${card.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium line-clamp-2 flex-1">{card.front}</p>
                {/* Badge stato */}
                {isNotStudied ? (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground flex-shrink-0">
                    Non studiata
                  </Badge>
                ) : isMastered ? (
                  <Badge className="bg-green-500 text-white flex-shrink-0">
                    ✅ Facile
                  </Badge>
                ) : (
                  <Badge className="bg-destructive text-white flex-shrink-0">
                    ❌ Da ripassare
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-muted rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
