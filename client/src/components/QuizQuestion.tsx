import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizQuestionProps {
  questionNumber: number;
  totalQuestions: number;
  question: string;
  options: string[];
  correctAnswer: number;
  onAnswer?: (isCorrect: boolean, selectedIndex: number) => void;
  onNext?: () => void;
}

export function QuizQuestion({
  questionNumber,
  totalQuestions,
  question,
  options,
  correctAnswer,
  onAnswer,
  onNext,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (hasSubmitted) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setHasSubmitted(true);
    onAnswer?.(selectedAnswer === correctAnswer, selectedAnswer);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setHasSubmitted(false);
    onNext?.();
  };

  const getOptionClass = (index: number) => {
    const base = "w-full min-h-14 h-auto justify-start text-left px-4 py-3 whitespace-normal";
    
    if (!hasSubmitted) {
      if (selectedAnswer === index) {
        return `${base} bg-primary/10 border-primary`;
      }
      return base;
    }

    if (index === correctAnswer) {
      return `${base} bg-status-online/10 border-status-online text-status-online dark:bg-status-online/30 dark:border-status-online dark:text-status-online`;
    }
    if (selectedAnswer === index && index !== correctAnswer) {
      return `${base} bg-destructive/10 border-destructive text-destructive dark:bg-destructive/30 dark:border-destructive dark:text-destructive`;
    }
    return base;
  };

  return (
    <div className="w-full max-w-2xl mx-auto" data-testid="quiz-question">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Domanda {questionNumber}/{totalQuestions}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((questionNumber / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-medium mb-6 break-words">{question}</h2>

          <div className="space-y-3">
            {options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className={getOptionClass(index)}
                onClick={() => handleSelect(index)}
                disabled={hasSubmitted}
                data-testid={`button-option-${index}`}
              >
                <span className="flex items-center gap-3 w-full">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 break-words">{option}</span>
                  {hasSubmitted && index === correctAnswer && (
                    <CheckCircle className="h-5 w-5 text-status-online dark:text-status-online flex-shrink-0" />
                  )}
                  {hasSubmitted && selectedAnswer === index && index !== correctAnswer && (
                    <XCircle className="h-5 w-5 text-destructive dark:text-destructive flex-shrink-0" />
                  )}
                </span>
              </Button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            {!hasSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                data-testid="button-submit-answer"
              >
                Conferma
              </Button>
            ) : (
              <Button onClick={handleNext} data-testid="button-next-question">
                {questionNumber < totalQuestions ? "Avanti" : "Risultati"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
