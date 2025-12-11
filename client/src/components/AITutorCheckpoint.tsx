import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Mic,
  PenLine,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface AITutorCheckpointProps {
  capitolo?: string;
  argomento?: string;
  domandaCorrente?: string;
  numerodomanda?: number;
  totaleDomande?: number;
  punteggioComprensione?: number;
  isEvaluating?: boolean;
  feedback?: {
    correttezza: number;
    messaggioCorretto?: string;
    messaggioGap?: string;
    collegamenti?: string;
  };
  onSubmitRisposta?: (risposta: string, tipo: "testo" | "voce") => void;
  onNextDomanda?: () => void;
  disabled?: boolean;
}

export function AITutorCheckpoint({
  capitolo = "Capitolo non specificato",
  argomento,
  domandaCorrente,
  numerodomanda = 1,
  totaleDomande = 3,
  punteggioComprensione,
  isEvaluating = false,
  feedback,
  onSubmitRisposta,
  onNextDomanda,
  disabled = false,
}: AITutorCheckpointProps) {
  const [risposta, setRisposta] = useState("");
  const [modalitaInput, setModalitaInput] = useState<"testo" | "voce">("testo");

  const handleSubmit = () => {
    if (risposta.trim() && onSubmitRisposta) {
      onSubmitRisposta(risposta, modalitaInput);
      setRisposta("");
    }
  };

  // Empty state
  if (!domandaCorrente && !feedback) {
    return (
      <Card className="border-dashed border-2" data-testid="card-ai-tutor-empty">
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">AI Tutor</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Completa la Fase 1 per sbloccare il tutor AI
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-ai-tutor">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            AI Tutor - Checkpoint Comprensione
          </CardTitle>
          <Badge variant="outline" data-testid="badge-domanda-numero">
            {numerodomanda}/{totaleDomande}
          </Badge>
        </div>
        {capitolo && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <BookOpen className="h-3 w-3" />
            Hai completato: {capitolo}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domanda */}
        {domandaCorrente && !feedback && (
          <>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Rispondi a voce o scritto:
              </p>
              <p className="font-medium" data-testid="text-domanda">
                {numerodomanda}. {domandaCorrente}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={modalitaInput === "voce" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModalitaInput("voce")}
                  disabled={disabled}
                  data-testid="button-input-voce"
                >
                  <Mic className="h-4 w-4 mr-1" />
                  Registra Risposta
                </Button>
                <Button
                  variant={modalitaInput === "testo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setModalitaInput("testo")}
                  disabled={disabled}
                  data-testid="button-input-testo"
                >
                  <PenLine className="h-4 w-4 mr-1" />
                  Scrivi
                </Button>
              </div>

              {modalitaInput === "testo" && (
                <Textarea
                  placeholder="Scrivi la tua risposta con parole tue..."
                  value={risposta}
                  onChange={(e) => setRisposta(e.target.value)}
                  disabled={disabled || isEvaluating}
                  className="min-h-[100px]"
                  data-testid="textarea-risposta"
                />
              )}

              {modalitaInput === "voce" && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Mic className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clicca per iniziare la registrazione
                  </p>
                  <Button className="mt-2" disabled data-testid="button-registra">
                    <Mic className="h-4 w-4 mr-2" />
                    Registra
                  </Button>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={disabled || isEvaluating || !risposta.trim()}
                data-testid="button-invia-risposta"
              >
                {isEvaluating ? "Valutazione in corso..." : "Invia Risposta"}
              </Button>
            </div>
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Valutazione:</span>
              <Badge
                variant={feedback.correttezza >= 70 ? "default" : "secondary"}
                data-testid="badge-correttezza"
              >
                {feedback.correttezza >= 70 ? "Buona" : "Parziale"} ({feedback.correttezza}%)
              </Badge>
            </div>

            {feedback.messaggioCorretto && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{feedback.messaggioCorretto}</p>
              </div>
            )}

            {feedback.messaggioGap && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{feedback.messaggioGap}</p>
              </div>
            )}

            {feedback.collegamenti && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{feedback.collegamenti}</p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={onNextDomanda}
              disabled={disabled}
              data-testid="button-prossima-domanda"
            >
              Prossima Domanda
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Punteggio comprensione */}
        {punteggioComprensione !== undefined && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Punteggio Comprensione Capitolo</span>
              <span className="font-medium">{punteggioComprensione}%</span>
            </div>
            <Progress value={punteggioComprensione} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
