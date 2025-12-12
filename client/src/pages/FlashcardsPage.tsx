import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/Flashcard";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Layers, X } from "lucide-react";
import { Link } from "wouter";

// todo: remove mock functionality
const mockFlashcards = [
  {
    id: "1",
    front: "Chi nomina il Responsabile del Procedimento?",
    back: "Il dirigente dell'unita organizzativa competente (art. 6, co. 1, L.241/90).",
    tags: ["L.241/90", "Procedimento"],
    difficulty: "medium" as const,
    source: "Art. 6 L.241/90",
  },
  {
    id: "2",
    front: "Cos'e la SCIA?",
    back: "Segnalazione Certificata di Inizio Attivita (art. 19 L.241/90). Consente di iniziare un'attivita subito dopo la presentazione della segnalazione.",
    tags: ["L.241/90", "SCIA"],
    difficulty: "easy" as const,
    source: "Art. 19 L.241/90",
  },
  {
    id: "3",
    front: "Qual e il termine massimo per la conclusione del procedimento amministrativo?",
    back: "30 giorni dalla data di avvio del procedimento, salvo diversa disposizione di legge o regolamento (art. 2, co. 2, L.241/90).",
    tags: ["L.241/90", "Termini"],
    difficulty: "medium" as const,
    source: "Art. 2 L.241/90",
  },
  {
    id: "4",
    front: "Cosa prevede l'art. 97 della Costituzione?",
    back: "I pubblici uffici sono organizzati secondo disposizioni di legge, in modo che siano assicurati il buon andamento e l'imparzialita dell'amministrazione.",
    tags: ["Costituzione", "Art. 97"],
    difficulty: "hard" as const,
    source: "Art. 97 Cost.",
  },
];

export default function FlashcardsPage() {
  const [flashcards] = useState(mockFlashcards);
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const handleResponse = (id: string, response: "easy" | "hard" | "forgot") => {
    console.log("Response for", id, ":", response);
    const newCompleted = completed + 1;
    setCompleted(newCompleted);
    
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionComplete(true);
    }
  };

  const startStudying = () => {
    setIsStudying(true);
    setCurrentIndex(0);
    setCompleted(0);
    setSessionComplete(false);
  };

  const stopStudying = () => {
    setIsStudying(false);
    setCurrentIndex(0);
    setSessionComplete(false);
  };

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
              Hai completato <span className="font-bold">{completed}</span> flashcard
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={stopStudying} data-testid="button-back-to-list">
                Torna alla Lista
              </Button>
              <Button onClick={startStudying} data-testid="button-restart-study">
                Ricomincia
              </Button>
            </div>
          </div>
        </div>
      );
    }

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
            Esci
          </Button>
          <div className="text-center">
            <span className="text-sm font-medium">
              {currentIndex + 1} / {flashcards.length}
            </span>
          </div>
          <div className="w-20" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <Flashcard
            {...flashcards[currentIndex]}
            onResponse={handleResponse}
          />
        </div>

        <footer className="p-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Completate: <span className="font-medium">{completed}</span> / {flashcards.length}
          </p>
        </footer>
      </div>
    );
  }

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
            {flashcards.length} flashcard da ripassare oggi
          </p>
        </div>
        <Button onClick={startStudying} data-testid="button-start-study">
          <Layers className="h-4 w-4 mr-2" />
          Inizia Ripasso
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcards.map((card) => (
          <div
            key={card.id}
            className="p-4 bg-card border border-card-border rounded-lg hover-elevate cursor-pointer"
            onClick={startStudying}
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
