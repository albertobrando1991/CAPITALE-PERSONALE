import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Flag, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Simulazione, DomandaSimulazione } from "@shared/schema";

interface SimulazioneEsameProps {
  simulazione: Simulazione;
  onComplete: (simulazione: Simulazione) => void;
}

export function SimulazioneEsame({ simulazione, onComplete }: SimulazioneEsameProps) {
  const { toast } = useToast();
  const [domande, setDomande] = useState<DomandaSimulazione[]>(
    (simulazione.domandeERisposte as any) || []
  );
  const [domandaCorrente, setDomandaCorrente] = useState(0);
  const [tempoRimanente, setTempoRimanente] = useState(
    simulazione.durataMinuti * 60
  );
  const [tempoInizio, setTempoInizio] = useState<Date | null>(null);
  const [showConfermaUscita, setShowConfermaUscita] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Inizializza il timer quando il componente viene montato
  useEffect(() => {
    if (!tempoInizio) {
      const now = new Date();
      setTempoInizio(now);
      startTimeRef.current = now;
    }

    // Timer countdown
    intervalRef.current = setInterval(() => {
      setTempoRimanente((prev) => {
        if (prev <= 0) {
          handleTerminaEsame(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Salvataggio automatico ogni 30 secondi
    const saveInterval = setInterval(() => {
      salvaProgresso();
    }, 30000);

    // Prevenzione uscita accidentale
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(saveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const salvaProgresso = async () => {
    try {
      await apiRequest("PATCH", `/api/simulazioni/${simulazione.id}`, {
        domandeERisposte: domande,
      });
    } catch (error) {
      console.error("Errore nel salvataggio automatico:", error);
    }
  };

  const updateSimulazioneMutation = useMutation({
    mutationFn: async (data: { domandeERisposte: DomandaSimulazione[]; tempoTrascorsoSecondi: number }) => {
      const res = await apiRequest("PATCH", `/api/simulazioni/${simulazione.id}/complete`, data);
      return res.json();
    },
    onSuccess: (simulazioneCompletata: Simulazione) => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulazioni"] });
      onComplete(simulazioneCompletata);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nel completamento della simulazione",
        variant: "destructive",
      });
    },
  });

  const handleRisposta = (opzione: string) => {
    const domandeAggiornate = [...domande];
    const domanda = domandeAggiornate[domandaCorrente];
    
    if (domanda) {
      const tempoImpiegato = startTimeRef.current
        ? Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
        : 0;

      domandeAggiornate[domandaCorrente] = {
        ...domanda,
        rispostaUtente: opzione,
        tempoSecondi: tempoImpiegato,
      };
      
      setDomande(domandeAggiornate);
      startTimeRef.current = new Date();
    }
  };

  const handleSegnaPerRevisione = () => {
    const domandeAggiornate = [...domande];
    const domanda = domandeAggiornate[domandaCorrente];
    
    if (domanda) {
      domandeAggiornate[domandaCorrente] = {
        ...domanda,
        segnataPerRevisione: !domanda.segnataPerRevisione,
      };
      setDomande(domandeAggiornate);
    }
  };

  const handleVaiADomanda = (index: number) => {
    setDomandaCorrente(index);
    startTimeRef.current = new Date();
  };

  const handleTerminaEsame = async (tempoScaduto = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const tempoTrascorso = tempoInizio
      ? Math.floor((new Date().getTime() - tempoInizio.getTime()) / 1000)
      : simulazione.durataMinuti * 60;

    await salvaProgresso();

    updateSimulazioneMutation.mutate({
      domandeERisposte: domande,
      tempoTrascorsoSecondi: tempoTrascorso,
    });
  };

  const domanda = domande[domandaCorrente];
  const domandeRisposte = domande.filter((d) => d.rispostaUtente).length;
  const domandeSegnate = domande.filter((d) => d.segnataPerRevisione).length;
  const minutiRimanenti = Math.floor(tempoRimanente / 60);
  const secondiRimanenti = tempoRimanente % 60;
  const isUltimi5Minuti = tempoRimanente <= 300;
  const isTempoScaduto = tempoRimanente <= 0;

  // Formatta il tempo
  const formatTime = (minuti: number, secondi: number) => {
    return `${minuti.toString().padStart(2, "0")}:${secondi.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Header con timer e statistiche */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <div
                className={`text-4xl font-bold ${
                  isUltimi5Minuti ? "text-red-600 animate-pulse" : "text-foreground"
                }`}
              >
                {formatTime(minutiRimanenti, secondiRimanenti)}
              </div>
            </div>

            {/* Statistiche */}
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Domanda {domandaCorrente + 1} / {domande.length}
              </Badge>
              <Badge variant="outline">
                Risposte: {domandeRisposte} / {domande.length}
              </Badge>
              {domandeSegnate > 0 && (
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                  <Flag className="h-3 w-3 mr-1" />
                  {domandeSegnate} da revisionare
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Domanda principale */}
        <div className="lg:col-span-3">
          <Card className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <CardContent className="p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-auto">
              {domanda ? (
                <>
                  {/* Numero domanda */}
                  <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Domanda {domandaCorrente + 1} di {domande.length}
                  </div>

                  {/* Domanda - con wrapping e scroll */}
                  <div className="mb-6">
                    {domanda.segnataPerRevisione && (
                      <Badge className="mb-4 bg-yellow-100 dark:bg-yellow-900">
                        <Flag className="h-3 w-3 mr-1" />
                        Segnata per revisione
                      </Badge>
                    )}
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 break-words whitespace-pre-wrap">
                      {domanda.domanda}
                    </h3>
                  </div>

                  {/* Opzioni risposta - 4 box ben formattati */}
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    {domanda.opzioni.map((opzione, idx) => {
                      const lettera = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelezionata = domanda.rispostaUtente === lettera;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleRisposta(lettera)}
                          className={`
                            p-4 rounded-lg border-2 text-left transition-all min-h-[44px]
                            hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                            break-words whitespace-pre-wrap
                            ${isSelezionata 
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400" 
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-lg flex-shrink-0">{lettera}.</span>
                            <span className="flex-1">{opzione}</span>
                            {isSelezionata && (
                              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pulsante segna per revisione */}
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={handleSegnaPerRevisione}
                      className={`
                        min-h-[44px] w-full sm:w-auto
                        ${domanda.segnataPerRevisione ? "bg-yellow-100 dark:bg-yellow-900" : ""}
                      `}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {domanda.segnataPerRevisione ? "Rimuovi segnalazione" : "Segna per revisione"}
                    </Button>
                  </div>
                </>
              ) : (
                <div>Domanda non trovata</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigazione domande */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-sm sm:text-base">Navigazione Domande</h3>
              <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {domande.map((d, index) => {
                  const hasRisposta = !!d.rispostaUtente;
                  const isSegnata = d.segnataPerRevisione;
                  const isCorrente = index === domandaCorrente;

                  return (
                    <button
                      key={index}
                      onClick={() => handleVaiADomanda(index)}
                      className={`
                        aspect-square rounded-md text-xs sm:text-sm font-medium transition-colors
                        min-h-[44px] min-w-[44px]
                        ${isCorrente ? "ring-2 ring-primary ring-offset-1" : ""}
                        ${hasRisposta
                          ? "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                          : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"}
                        ${isSegnata ? "border-2 border-yellow-500 dark:border-yellow-400" : ""}
                      `}
                    >
                      {index + 1}
                      {isSegnata && (
                        <Flag className="h-2 w-2 mx-auto mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pulsante Termina Esame */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={() => setShowConfermaUscita(true)}
          variant="destructive"
          size="lg"
          disabled={updateSimulazioneMutation.isPending || isTempoScaduto}
        >
          {updateSimulazioneMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Elaborazione...
            </>
          ) : (
            "Termina Esame"
          )}
        </Button>
      </div>

      {/* Dialog conferma uscita */}
      <AlertDialog open={showConfermaUscita} onOpenChange={setShowConfermaUscita}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminare l'esame?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler terminare l'esame? Le risposte verranno salvate e verrà calcolato il punteggio finale.
              {domandeRisposte < domande.length && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  Attenzione: hai risposto solo a {domandeRisposte} domande su {domande.length}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleTerminaEsame(false)}>
              Termina Esame
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
