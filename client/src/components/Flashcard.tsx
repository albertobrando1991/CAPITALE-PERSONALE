import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Lightbulb } from "lucide-react";

interface FlashcardProps {
  id: string;
  front: string;
  back: string;
  tags: string[];
  status?: "new" | "easy" | "hard";
  source?: string;
  onResponse?: (id: string, response: "easy" | "hard" | "forgot") => void;
  onRequestExplanation?: () => void;
}

const statusColors = {
  new: "border-gray-200 bg-white dark:bg-card",
  easy: "border-green-500 bg-green-50/30 dark:bg-green-950/10",
  hard: "border-red-500 bg-red-50/30 dark:bg-red-950/10",
};

export function Flashcard({
  id,
  front,
  back,
  tags,
  status = "new",
  source,
  onResponse,
  onRequestExplanation,
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
        className={`min-h-96 cursor-pointer transition-all duration-300 border-2 ${statusColors[status]}`}
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
            {/* Difficoltà rimossa come richiesto */}
          </div>

          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-4 w-full">
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
                  
                  {onRequestExplanation && (
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestExplanation();
                        }}
                        className="w-full border-yellow-300 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 sm:text-sm text-xs"
                      >
                        <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">💡 Non ho capito, spiegamelo meglio</span>
                      </Button>
                    </div>
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
            className="flex-1 max-w-40 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              handleResponse("forgot");
            }}
            data-testid="button-response-forgot"
          >
            Non Ricordo
          </Button>
          <Button
            variant="outline"
            className="flex-1 max-w-40 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            onClick={(e) => {
              e.stopPropagation();
              handleResponse("easy");
            }}
            data-testid="button-response-easy"
          >
            Facile
          </Button>
        </div>
      )}
    </div>
  );
}
