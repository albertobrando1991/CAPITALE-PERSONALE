// ============================================================================
// DRILL SESSION ACTIVE COMPONENT
// File: client/src/components/fase3/DrillSessionActive.tsx
// Interfaccia quiz attiva durante drill
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import type { DrillConfig } from './DrillSessionSetup';

interface DrillSessionActiveProps {
  concorsoId: number | string;
  sessionId: number;
  config: DrillConfig;
  initialQuestions?: any[];
  onComplete: (results: DrillResults) => void;
  onCancel: () => void;
}

export interface DrillResults {
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  durationSeconds: number;
  newErrorsFound: number;
  questionsData: QuestionResult[];
}

interface QuestionResult {
  questionId: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

// Mock quiz data (in produzione: fetch da API)
interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
}

export default function DrillSessionActive({
  concorsoId,
  sessionId,
  config,
  initialQuestions,
  onComplete,
  onCancel
}: DrillSessionActiveProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionsData, setQuestionsData] = useState<QuestionResult[]>([]);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timer, setTimer] = useState(0);
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch domande reali
  useEffect(() => {
    const fetchQuestions = async () => {
      // Se abbiamo già le domande, usiamole!
      if (initialQuestions && initialQuestions.length > 0) {
        // Normalizza formato se necessario
        const normalized = initialQuestions.map((q: any) => ({
            id: q.id || Math.random(),
            text: q.text || q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
            topic: q.topic || "Generale"
        }));
        setQuestions(normalized);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/fase3/${concorsoId}/drill-sessions/${sessionId}/questions`, {
          credentials: "include",
        });
        
        if (!response.ok) throw new Error('Errore fetch domande');
        
        const data = await response.json();
        setQuestions(data);
      } catch (error) {
        console.error('Errore caricamento domande:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [concorsoId, sessionId]); // RIMOSSO initialQuestions dalle dipendenze per evitare loop infiniti se l'array cambia reference ma non contenuto

  // Timer
  useEffect(() => {
    if (loading || questions.length === 0) return;
    
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, loading, questions.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return; // Blocca cambio risposta dopo submit
    setSelectedAnswer(answer);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    // Salva risultato locale
    const result: QuestionResult = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent
    };

    setQuestionsData([...questionsData, result]);
    setShowFeedback(true);

    // Se errore, salva nel DB (Error Binning)
    if (!isCorrect) {
      try {
        console.log("Salvataggio errore in corso...", {
          source_type: 'drill',
          source_id: sessionId,
          topic_name: currentQuestion.topic || 'Generale',
          question_text: currentQuestion.text,
        });

        const errorResponse = await fetch(`/api/fase3/${concorsoId}/errors`, {
          method: 'POST',
          credentials: "include",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_type: 'drill',
            source_id: sessionId,
            topic_name: currentQuestion.topic || 'Generale',
            materia_id: null, // Opzionale, se disponibile nei metadati della domanda
            question_text: currentQuestion.text,
            wrong_answer: selectedAnswer,
            correct_answer: currentQuestion.correctAnswer,
            explanation: currentQuestion.explanation,
            mistake_type: 'knowledge_gap' // Default, migliorabile con feedback utente
          })
        });
        
        if (!errorResponse.ok) {
            const errorText = await errorResponse.text();
            console.error("Errore salvataggio server:", errorText);
            toast({
                title: "Errore di connessione",
                description: "Non sono riuscito a salvare l'errore nel database.",
                variant: "destructive"
            });
        } else {
            console.log("Errore salvato con successo!");
            toast({
                title: "Errore registrato",
                description: "Aggiunto all'Error Binning per il ripasso.",
                variant: "destructive"
            });
        }

      } catch (error) {
        console.error('Errore salvataggio errore (catch):', error);
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setQuestionStartTime(Date.now());
    } else {
      // Fine drill
      const totalDuration = Math.floor((Date.now() - startTime) / 1000);
      const correctAnswers = questionsData.filter(q => q.isCorrect).length + (
        selectedAnswer === currentQuestion.correctAnswer ? 1 : 0
      );
      const wrongAnswers = questions.length - correctAnswers;

      onComplete({
        correctAnswers,
        wrongAnswers,
        skippedQuestions: 0,
        durationSeconds: totalDuration,
        newErrorsFound: wrongAnswers,
        questionsData: [...questionsData, {
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          userAnswer: selectedAnswer || '',
          correctAnswer: currentQuestion.correctAnswer,
          isCorrect: selectedAnswer === currentQuestion.correctAnswer,
          timeSpent: Math.floor((Date.now() - questionStartTime) / 1000)
        }]
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium mb-2">Caricamento domande personalizzate...</p>
          <div className="text-sm text-orange-500 font-semibold bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg inline-block">
            ⚠️ Non uscire dalla pagina, attendi l'elaborazione completa.
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto">
            Stiamo generando distrattori intelligenti con l'AI. La prima volta potrebbe richiedere fino a 30-60 secondi.
            Le volte successive sarà istantaneo grazie alla Smart Cache.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Se questions è vuoto, mostriamo il loader o un messaggio di errore se il caricamento è finito
  if (questions.length === 0) {
      if (initialQuestions && initialQuestions.length > 0) {
           // Se abbiamo initialQuestions ma questions è vuoto, stiamo ancora processando...
           return (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Elaborazione domande...</p>
              </CardContent>
            </Card>
           )
      }

    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Nessuna domanda trovata</h3>
          <p className="text-muted-foreground mb-6">
            Non ci sono ancora quiz generati per questa materia. 
            <br/>
            Torna alla Fase 2 (Acquisizione) o usa il Generatore AI per creare nuove domande.
          </p>
          <Button onClick={onCancel}>Torna indietro</Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  if (!currentQuestion) {
      return <div>Errore: Indice domanda non valido</div>
  }

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            Domanda {currentQuestionIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Clock className="h-4 w-4 mr-2" />
            {formatTime(timer)}
          </Badge>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Annulla Sessione
        </Button>
      </div>

      {/* Progress Bar */}
      <div>
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2 text-center">
          {progress.toFixed(0)}% completato
        </p>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">
              {currentQuestion.text}
            </CardTitle>
            <Badge>{currentQuestion.topic}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;
              
              let bgColor = 'bg-background hover:bg-accent';
              let borderColor = 'border-border';
              
              if (showFeedback) {
                if (isCorrectAnswer) {
                  bgColor = 'bg-green-50 dark:bg-green-950';
                  borderColor = 'border-green-500';
                } else if (isSelected && !isCorrect) {
                  bgColor = 'bg-red-50 dark:bg-red-950';
                  borderColor = 'border-red-500';
                }
              } else if (isSelected) {
                bgColor = 'bg-blue-50 dark:bg-blue-950';
                borderColor = 'border-blue-500';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${bgColor} ${borderColor} ${
                    !showFeedback ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {showFeedback && isCorrectAnswer && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <Alert className={isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <AlertDescription className={isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                <strong>{isCorrect ? '✅ Corretto!' : '❌ Errato!'}</strong>
                <p className="mt-2">{currentQuestion.explanation}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!showFeedback ? (
              <Button
                size="lg"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!selectedAnswer}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Conferma Risposta
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                onClick={handleNext}
              >
                {currentQuestionIndex < questions.length - 1 ? (
                  <>Prossima Domanda →</>
                ) : (
                  <>Completa Sessione 🎉</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Corrette</p>
                <p className="text-2xl font-bold text-green-600">
                  {questionsData.filter(q => q.isCorrect).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errate</p>
                <p className="text-2xl font-bold text-red-600">
                  {questionsData.filter(q => !q.isCorrect).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Medio</p>
                <p className="text-2xl font-bold">
                  {questionsData.length > 0
                    ? Math.floor(questionsData.reduce((sum, q) => sum + q.timeSpent, 0) / questionsData.length)
                    : 0}s
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
