import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/Flashcard";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Layers, X, Loader2, Play, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Flashcard as FlashcardType } from "@shared/schema";

interface SessionProgress {
  currentIndex: number;
  completedIds: string[];
  totalCards: number;
  savedAt: number;
}

function mapFlashcardForDisplay(card: FlashcardType) {
  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (card.livelloSRS !== null && card.livelloSRS !== undefined) {
    if (card.livelloSRS >= 3) difficulty = "easy";
    else if (card.livelloSRS === 0) difficulty = "medium";
  }

  const tags: string[] = [];
  if (card.materia) tags.push(card.materia);
  if (card.tipo && card.tipo !== "concetto") tags.push(card.tipo);

  return {
    id: card.id,
    front: card.fronte,
    back: card.retro,
    tags,
    difficulty,
    source: card.fonte || undefined,
  };
}

export default function FlashcardsPage() {
  const { data: flashcardsRaw = [], isLoading } = useQuery<FlashcardType[]>({
    queryKey: ["/api/flashcards"],
  });

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

  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  const handleResponse = (id: string, response: "easy" | "hard" | "forgot") => {
    console.log("Response for", id, ":", response);
    const newCompletedIds = [...completedIds, id];
    setCompletedIds(newCompletedIds);
    
    if (currentIndex < flashcards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      saveSessionMutation.mutate({
        currentIndex: newIndex,
        completedIds: newCompletedIds,
        totalCards: flashcards.length,
        savedAt: Date.now(),
      });
    } else {
      setSessionComplete(true);
      clearSessionMutation.mutate();
    }
  };

  const startStudying = (fromBeginning: boolean = true) => {
    if (fromBeginning) {
      setCurrentIndex(0);
      setCompletedIds([]);
      clearSessionMutation.mutate();
    }
    setIsStudying(true);
    setSessionComplete(false);
  };

  const resumeStudying = () => {
    if (savedProgress && savedProgress.currentIndex < flashcards.length) {
      setCurrentIndex(savedProgress.currentIndex);
      setCompletedIds(savedProgress.completedIds);
      setIsStudying(true);
      setSessionComplete(false);
    } else {
      startStudying(true);
    }
  };

  const stopStudying = () => {
    if (completedIds.length > 0 && currentIndex < flashcards.length) {
      saveSessionMutation.mutate({
        currentIndex,
        completedIds,
        totalCards: flashcards.length,
        savedAt: Date.now(),
      });
    }
    setIsStudying(false);
    setSessionComplete(false);
  };

  const discardProgress = () => {
    clearSessionMutation.mutate();
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
              <Button variant="outline" onClick={() => { setIsStudying(false); setSessionComplete(false); }} data-testid="button-back-to-list">
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

    const progressPercent = (currentIndex / flashcards.length) * 100;

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
          <div className="flex-1 max-w-xs mx-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {currentIndex + 1} / {flashcards.length}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <div className="w-24 text-right">
            <span className="text-sm text-muted-foreground">
              {completedIds.length} completate
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <Flashcard
            {...flashcards[currentIndex]}
            onResponse={handleResponse}
          />
        </div>

        <footer className="p-4 border-t">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Completate: <span className="font-medium text-foreground">{completedIds.length}</span></span>
            <span>Rimanenti: <span className="font-medium text-foreground">{flashcards.length - currentIndex}</span></span>
          </div>
        </footer>
      </div>
    );
  }

  const hasValidProgress = savedProgress && savedProgress.currentIndex < flashcards.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Flashcard</h1>
          <p className="text-muted-foreground mt-1">
            {flashcards.length} flashcard disponibili
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
        {flashcards.map((card, index) => (
          <div
            key={card.id}
            className={`p-4 bg-card border border-card-border rounded-lg hover-elevate cursor-pointer ${
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
            <p className="font-medium line-clamp-2 mb-2">{card.front}</p>
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
        ))}
      </div>
    </div>
  );
}
