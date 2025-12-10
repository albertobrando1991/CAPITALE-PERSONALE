import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface FlashcardProps {
  id: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  source?: string;
  onResponse?: (id: string, response: "easy" | "hard" | "forgot") => void;
}

const difficultyLabels = {
  easy: "Facile",
  medium: "Medio",
  hard: "Difficile",
};

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function Flashcard({
  id,
  front,
  back,
  tags,
  difficulty,
  source,
  onResponse,
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleResponse = (response: "easy" | "hard" | "forgot") => {
    onResponse?.(id, response);
    setIsFlipped(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card
        className="min-h-96 cursor-pointer transition-all duration-300"
        onClick={handleFlip}
        data-testid={`flashcard-${id}`}
      >
        <CardContent className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <Badge className={`text-xs ${difficultyColors[difficulty]}`}>
              {difficultyLabels[difficulty]}
            </Badge>
          </div>

          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-4">
              {!isFlipped ? (
                <p className="text-xl font-medium">{front}</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-xl">{back}</p>
                  {source && (
                    <p className="text-sm text-muted-foreground italic">
                      Fonte: {source}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <RotateCcw className="h-4 w-4" />
            <span>{isFlipped ? "Clicca per vedere la domanda" : "Clicca per vedere la risposta"}</span>
          </div>
        </CardContent>
      </Card>

      {isFlipped && (
        <div className="flex gap-3 mt-6 justify-center">
          <Button
            variant="outline"
            className="flex-1 max-w-32 bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            onClick={(e) => {
              e.stopPropagation();
              handleResponse("easy");
            }}
            data-testid="button-response-easy"
          >
            Facile
          </Button>
          <Button
            variant="outline"
            className="flex-1 max-w-32 bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400"
            onClick={(e) => {
              e.stopPropagation();
              handleResponse("hard");
            }}
            data-testid="button-response-hard"
          >
            Difficile
          </Button>
          <Button
            variant="outline"
            className="flex-1 max-w-32 bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              handleResponse("forgot");
            }}
            data-testid="button-response-forgot"
          >
            Non Ricordo
          </Button>
        </div>
      )}
    </div>
  );
}
