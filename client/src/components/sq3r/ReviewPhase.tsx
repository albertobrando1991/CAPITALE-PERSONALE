import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Domanda {
  domanda: string;
  opzioni: string[];
  rispostaCorretta: number;
  rispostaUtente?: number;
  spiegazione: string;
}

interface ReviewPhaseProps {
  capitolo: {
    id: string;
    titolo: string;
    materiaId?: string;
    reviewData?: {
      domande: Domanda[];
      punteggio?: number;
      percentualeCorrette?: number;
    };
  };
  onComplete: () => void;
}

export default function ReviewPhase({ capitolo, onComplete }: ReviewPhaseProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [risposte, setRisposte] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // NEW: Fetch quiz from new endpoint
  const { data: quizData, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ['quiz', capitolo.id],
    queryFn: async () => {
      const res = await fetch(`/api/sq3r/capitoli/${capitolo.id}/quiz`);
      if (!res.ok) return null;
      return res.json();
    },
    // Don't retry if 404 (no quiz yet)
    retry: false
  });

  const domande = quizData?.domande || capitolo.reviewData?.domande || [];
  const hasDomande = domande.length > 0;

  // Genera domande con AI
  const generaDomandeMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const res = await fetch(`/api/sq3r/capitoli/${capitolo.id}/genera-review`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore generazione quiz');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Quiz generato con successo!",
        description: "Ora puoi iniziare il test di verifica."
      });
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitolo.id] });
      queryClient.invalidateQueries({ queryKey: ['quiz', capitolo.id] }); // Invalidate quiz query
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la generazione del quiz",
        variant: "destructive"
      });
      setIsGenerating(false);
    },
  });

  // Completa Review
  const completeMutation = useMutation({
    mutationFn: async () => {
      const risposteCorrette = domande.filter(
        (d: any, idx: number) => d.rispostaCorretta === risposte[idx]
      ).length;
      const percentuale = Math.round((risposteCorrette / domande.length) * 100);

      const res = await fetch(`/api/sq3r/capitoli/${capitolo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewCompletato: true,
          completato: true, // Capitolo completato!
          faseCorrente: 'completed',
          reviewData: {
            ...capitolo.reviewData,
            punteggio: risposteCorrette,
            percentualeCorrette: percentuale,
            completatoAt: new Date(),
          },
        }),
      });

      if (!res.ok) throw new Error('Errore salvataggio');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "🎉 Capitolo completato!",
        description: "Hai completato con successo tutte le fasi SQ3R per questo capitolo."
      });
      // Invalida query specifiche e liste per aggiornare UI globale
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitolo.id] });
      queryClient.invalidateQueries({ queryKey: ['capitoli'] }); 
      queryClient.invalidateQueries({ queryKey: ['materie'] });
      onComplete();
    },
  });

  const handleRisposta = (indiceRisposta: number) => {
    const newRisposte = [...risposte];
    newRisposte[currentQuestion] = indiceRisposta;
    setRisposte(newRisposte);
  };

  const handleNext = () => {
    if (risposte[currentQuestion] === undefined) {
      toast({
        title: "Attenzione",
        description: "Seleziona una risposta prima di continuare",
        variant: "destructive"
      });
      return;
    }

    if (currentQuestion < domande.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calcolaRisultati = () => {
    const corrette = domande.filter((d, idx) => d.rispostaCorretta === risposte[idx]).length;
    const percentuale = Math.round((corrette / domande.length) * 100);
    return { corrette, totale: domande.length, percentuale };
  };

  // UI: Genera Quiz
  if (!hasDomande) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✅ Fase REVIEW - Quiz Finale
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Sparkles className="h-16 w-16 text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Genera il Quiz di Verifica
            </h3>
            <p className="text-sm text-muted-foreground">
              L'AI creerà 5 domande personalizzate basate sul contenuto che hai studiato
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => generaDomandeMutation.mutate()} 
            disabled={isGenerating} 
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Genera Quiz con AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // UI: Risultati
  if (showResults) {
    const risultati = calcolaRisultati();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>🎯 Risultati Quiz</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                 if(window.confirm("Vuoi generare nuove domande con l'AI?")) {
                    generaDomandeMutation.mutate();
                    setCurrentQuestion(0);
                    setRisposte([]);
                    setShowResults(false);
                 }
              }}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
              Nuovo Quiz AI
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {risultati.percentuale}%
              </div>
              <p className="text-muted-foreground">
                {risultati.corrette} su {risultati.totale} corrette
              </p>
            </div>

            <Progress value={risultati.percentuale} className="h-3" />

            <div className="p-4 rounded-lg bg-muted">
              {risultati.percentuale >= 80 && (
                <p className="text-center text-green-600 font-semibold">
                  🎉 Ottimo lavoro! Hai dimostrato una solida comprensione!
                </p>
              )}
              {risultati.percentuale >= 60 && risultati.percentuale < 80 && (
                <p className="text-center text-blue-600 font-semibold">
                  👍 Buon risultato! Rivedi i concetti su cui hai avuto dubbi.
                </p>
              )}
              {risultati.percentuale < 60 && (
                <p className="text-center text-orange-600 font-semibold">
                  📚 Consigliamo di rivedere il capitolo prima di continuare.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dettaglio Risposte */}
        <div className="space-y-3">
          {domande.map((domanda, idx) => {
            const isCorretta = risposte[idx] === domanda.rispostaCorretta;
            
            return (
              <Card key={idx} className={isCorretta ? 'border-green-500' : 'border-red-500'}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {isCorretta ? (
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold">
                        Domanda {idx + 1}: {domanda.domanda}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Tua risposta:</strong>{' '}
                          <span className={isCorretta ? 'text-green-600' : 'text-red-600'}>
                            {domanda.opzioni[risposte[idx]]}
                          </span>
                        </p>
                        {!isCorretta && (
                          <p>
                            <strong>Risposta corretta:</strong>{' '}
                            <span className="text-green-600">
                              {domanda.opzioni[domanda.rispostaCorretta]}
                            </span>
                          </p>
                        )}
                        <p className="text-muted-foreground italic">
                          💡 {domanda.spiegazione}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button 
          size="lg" 
          className="w-full" 
          onClick={() => completeMutation.mutate()} 
          disabled={completeMutation.isPending} 
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Completa Capitolo
        </Button>
      </div>
    );
  }

  // UI: Quiz
  const domandaCorrente = domande[currentQuestion];
  const progresso = Math.round(((currentQuestion + 1) / domande.length) * 100);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Domanda {currentQuestion + 1} di {domande.length}</span>
              <span>{progresso}%</span>
            </div>
            <Progress value={progresso} />
          </div>
        </CardContent>
      </Card>

      {/* Domanda */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">❓ {domandaCorrente.domanda}</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Rigenera Quiz con AI"
            onClick={() => {
              if(window.confirm("Vuoi rigenerare il quiz con l'AI? I progressi attuali andranno persi.")) {
                 generaDomandeMutation.mutate();
                 setCurrentQuestion(0);
                 setRisposte([]);
                 setShowResults(false);
              }
            }}
            disabled={isGenerating}
          >
            <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={risposte[currentQuestion]?.toString()} 
            onValueChange={(value) => handleRisposta(parseInt(value))} 
          >
            {domandaCorrente.opzioni.map((opzione, idx) => (
              <div key={idx} className="flex items-center space-x-2 p-3 rounded border hover:bg-muted transition-colors">
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                  {opzione}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handlePrevious} 
          disabled={currentQuestion === 0} 
          className="flex-1" 
        >
          Precedente
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={risposte[currentQuestion] === undefined} 
          className="flex-1" 
        >
          {currentQuestion === domande.length - 1 ? 'Vedi Risultati' : 'Successiva'}
        </Button>
      </div>
    </div>
  );
}