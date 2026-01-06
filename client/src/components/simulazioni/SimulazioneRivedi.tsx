import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { Simulazione, DomandaSimulazione } from "@shared/schema";

interface SimulazioneRivediProps {
  simulazioneId: string;
  concorsoId?: string;
}

export function SimulazioneRivedi({ simulazioneId, concorsoId }: SimulazioneRivediProps) {
  const [, setLocation] = useLocation();
  const [domandaCorrente, setDomandaCorrente] = useState(0);

  const { data: simulazione, isLoading } = useQuery<Simulazione>({
    queryKey: ["/api/simulazioni", simulazioneId],
    queryFn: async () => {
      const res = await fetch(`/api/simulazioni/${simulazioneId}`);
      if (!res.ok) throw new Error("Failed to fetch simulazione");
      return res.json();
    },
    enabled: !!simulazioneId,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!simulazione || !simulazione.completata) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Simulazione non trovata o non completata.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const domande = (simulazione.domandeERisposte || []) as DomandaSimulazione[];
  const domanda = domande[domandaCorrente];

  if (!domanda) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Domanda non trovata.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rispostaCorretta = domanda.rispostaCorretta?.toUpperCase() || '';
  const rispostaUtente = domanda.rispostaUtente?.toUpperCase() || '';
  const isCorretta = rispostaUtente === rispostaCorretta;

  const handlePrev = () => {
    if (domandaCorrente > 0) {
      setDomandaCorrente(domandaCorrente - 1);
    }
  };

  const handleNext = () => {
    if (domandaCorrente < domande.length - 1) {
      setDomandaCorrente(domandaCorrente + 1);
    }
  };

  const formatTime = (secondi?: number) => {
    if (!secondi) return "N/A";
    const minuti = Math.floor(secondi / 60);
    const sec = secondi % 60;
    return `${minuti}m ${sec}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            if (concorsoId) {
              setLocation(`/concorsi/${concorsoId}/simulazione/${simulazioneId}/report`);
            } else {
              setLocation(`/concorsi/${concorsoId || ''}/simulazioni`);
            }
          }}
          className="min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al Report
        </Button>
        <Badge variant="outline" className="text-sm sm:text-base">
          Domanda {domandaCorrente + 1} di {domande.length}
        </Badge>
      </div>

      {/* Domanda */}
      <Card
        className={`${
          isCorretta
            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg sm:text-xl">Domanda {domandaCorrente + 1}</CardTitle>
            <Badge
              className={isCorretta ? "bg-green-500" : "bg-red-500"}
            >
              {isCorretta ? "✅ Corretta" : "❌ Errata"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Testo domanda */}
          <p className="font-medium break-words whitespace-pre-wrap text-sm sm:text-base">
            {domanda.domanda}
          </p>

          {/* Opzioni */}
          <div className="space-y-2">
            {domanda.opzioni.map((opzione, idx) => {
              const lettera = String.fromCharCode(65 + idx); // A, B, C, D
              const isRispostaCorretta = lettera === rispostaCorretta;
              const isRispostaUtente = lettera === rispostaUtente;

              return (
                <div
                  key={idx}
                  className={`
                    p-3 sm:p-4 rounded-lg border-2 break-words
                    ${isRispostaCorretta
                      ? "border-green-500 bg-green-100 dark:bg-green-900/30"
                      : isRispostaUtente && !isCorretta
                      ? "border-red-500 bg-red-100 dark:bg-red-900/30"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-base sm:text-lg flex-shrink-0">{lettera}.</span>
                    <span className="flex-1">{opzione}</span>
                    {isRispostaCorretta && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                    {isRispostaUtente && !isCorretta && !isRispostaCorretta && (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info risposte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">La tua risposta:</span>
              <p
                className={`
                  p-3 rounded mt-1 break-words
                  ${isCorretta
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                    : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                  }
                `}
              >
                {rispostaUtente || "Non data"}
                {rispostaUtente && domanda.opzioni[rispostaUtente.charCodeAt(0) - 65] && (
                  <span className="ml-2 text-sm">
                    - {domanda.opzioni[rispostaUtente.charCodeAt(0) - 65]}
                  </span>
                )}
              </p>
            </div>
            {!isCorretta && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Risposta corretta:</span>
                <p className="p-3 rounded mt-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 break-words">
                  {rispostaCorretta}
                  {domanda.opzioni[rispostaCorretta.charCodeAt(0) - 65] && (
                    <span className="ml-2 text-sm">
                      - {domanda.opzioni[rispostaCorretta.charCodeAt(0) - 65]}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Tempo */}
          {domanda.tempoSecondi !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-2 border-t">
              <Clock className="h-4 w-4" />
              <span>Tempo impiegato: {formatTime(domanda.tempoSecondi)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigazione */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrev}
          disabled={domandaCorrente === 0}
          variant="outline"
          className="min-h-[44px] flex-1 sm:flex-none"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Precedente
        </Button>

        <div className="flex gap-2 overflow-x-auto">
          {domande.map((_, idx) => {
            const d = domande[idx];
            const rispUtente = d.rispostaUtente?.toUpperCase() || '';
            const rispCorretta = d.rispostaCorretta?.toUpperCase() || '';
            const isCorrettaDomanda = rispUtente === rispCorretta;
            const isCurrent = idx === domandaCorrente;

            return (
              <button
                key={idx}
                onClick={() => setDomandaCorrente(idx)}
                className={`
                  min-w-[44px] min-h-[44px] rounded-md text-sm font-medium transition-colors
                  ${isCurrent ? "ring-2 ring-primary ring-offset-1" : ""}
                  ${rispUtente
                    ? isCorrettaDomanda
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }
                `}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleNext}
          disabled={domandaCorrente === domande.length - 1}
          variant="outline"
          className="min-h-[44px] flex-1 sm:flex-none"
        >
          Successiva
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
