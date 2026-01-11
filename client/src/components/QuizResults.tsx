import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Trophy, RotateCcw, Home } from "lucide-react";

interface WrongAnswer {
  question: string;
  yourAnswer: string;
  correctAnswer: string;
}

interface QuizResultsProps {
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  wrongAnswers: WrongAnswer[];
  onRetry?: () => void;
  onHome?: () => void;
}

export function QuizResults({
  totalQuestions,
  correctAnswers,
  timeSpent,
  wrongAnswers,
  onRetry,
  onHome,
}: QuizResultsProps) {
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const getScoreColor = () => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreMessage = () => {
    if (score >= 90) return "Eccellente!";
    if (score >= 80) return "Ottimo lavoro!";
    if (score >= 70) return "Buon risultato!";
    if (score >= 60) return "Sufficiente";
    return "Continua a studiare!";
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" data-testid="quiz-results">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Quiz Completato!</CardTitle>
          <p className="text-muted-foreground">{getScoreMessage()}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-3xl font-bold ${getScoreColor()}`}>
                {score}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Punteggio</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold flex items-center justify-center gap-1">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                {correctAnswers}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Corrette</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold flex items-center justify-center gap-1">
                <Clock className="h-6 w-6 text-muted-foreground" />
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Tempo</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onHome}
              data-testid="button-home"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button className="flex-1" onClick={onRetry} data-testid="button-retry">
              <RotateCcw className="h-4 w-4 mr-2" />
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>

      {wrongAnswers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Risposte Errate ({wrongAnswers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wrongAnswers.map((wrong, index) => (
              <div
                key={index}
                className="p-4 bg-muted rounded-lg space-y-2"
                data-testid={`wrong-answer-${index}`}
              >
                <p className="font-medium break-words">{wrong.question}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Badge variant="destructive" className="gap-1 h-auto whitespace-normal text-left justify-start py-1">
                    <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="break-words">Tua risposta: {wrong.yourAnswer}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-1 bg-status-online/10 text-status-online border-status-online/20 dark:bg-status-online/20 dark:text-status-online dark:border-status-online/30 h-auto whitespace-normal text-left justify-start py-1"
                  >
                    <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="break-words">Corretta: {wrong.correctAnswer}</span>
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
