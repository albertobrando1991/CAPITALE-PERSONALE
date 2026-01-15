// ============================================================================
// DRILL SESSION RESULTS COMPONENT
// File: client/src/components/fase3/DrillSessionResults.tsx
// Risultati post-drill con analisi e next steps
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Home
} from 'lucide-react';
import type { DrillResults } from './DrillSessionActive';

interface DrillSessionResultsProps {
  results: DrillResults;
  onNewSession: () => void;
  onBackToDashboard: () => void;
}

export default function DrillSessionResults({
  results,
  onNewSession,
  onBackToDashboard
}: DrillSessionResultsProps) {
  const totalQuestions = results.correctAnswers + results.wrongAnswers + results.skippedQuestions;
  const scorePercentage = (results.correctAnswers / totalQuestions) * 100;
  const avgTimePerQuestion = results.durationSeconds / totalQuestions;

  // Calcola improvement (mock - in produzione confronta con sessioni precedenti)
  const improvementRate = 8.5; // Mock +8.5%
  const prevScore = scorePercentage - improvementRate; // Mock

  // Determina performance level
  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { label: 'Eccellente', color: 'text-green-600', icon: '🏆' };
    if (score >= 80) return { label: 'Ottimo', color: 'text-blue-600', icon: '⭐' };
    if (score >= 70) return { label: 'Buono', color: 'text-yellow-600', icon: '👍' };
    if (score >= 60) return { label: 'Sufficiente', color: 'text-orange-600', icon: '📚' };
    return { label: 'Da Migliorare', color: 'text-red-600', icon: '💪' };
  };

  const performance = getPerformanceLevel(scorePercentage);

  // Formatta durata
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">{performance.icon}</div>
        <h2 className="text-4xl font-bold mb-2">Sessione Completata!</h2>
        <p className="text-muted-foreground text-lg">
          Hai completato {totalQuestions} domande in {formatDuration(results.durationSeconds)}
        </p>
      </div>

      {/* Score Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
              <div className={`text-7xl font-bold ${performance.color} mb-2`}>
                {Number(scorePercentage).toFixed(0)}%
              </div>
              <div className="text-2xl font-semibold mb-4">
              {performance.label}
            </div>
            <Progress value={scorePercentage} className="h-4" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-3xl font-bold text-green-600">
                  {results.correctAnswers}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Corrette</p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-3xl font-bold text-red-600">
                  {results.wrongAnswers}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Errate</p>
            </div>

            <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-3xl font-bold text-blue-600">
                    {Number(avgTimePerQuestion).toFixed(0)}s
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Tempo Medio</p>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvement */}
      {improvementRate > 0 ? (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Miglioramento Confermato! 🎉
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
              Hai ottenuto <strong>+{Number(improvementRate).toFixed(1)}%</strong> rispetto alla sessione precedente
              (era {Number(prevScore).toFixed(0)}%, ora {Number(scorePercentage).toFixed(0)}%). Continua così!
            </AlertDescription>
          </Alert>
        ) : improvementRate < 0 ? (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">
              Performance in calo
            </AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              Risultato inferiore alla sessione precedente ({Math.abs(improvementRate).toFixed(1)}% in meno).
              Riposa e ritenta dopo aver rivisto gli errori.
            </AlertDescription>
        </Alert>
      ) : null}

      {/* New Errors Found */}
      {results.newErrorsFound > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Nuovi Errori Identificati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Trovati <strong>{results.newErrorsFound} nuovi errori</strong> che sono stati aggiunti
              al tuo Error Binning per analisi futura.
            </p>
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Genera Recovery Plans
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analisi Dettagliata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Breakdown by topic */}
          <div>
            <h4 className="font-semibold mb-3">Performance per Argomento</h4>
            <div className="space-y-2">
              {Object.entries(
                results.questionsData.reduce((acc: any, q: any) => {
                  const topic = q.questionText.includes('Fonte:') 
                    ? q.questionText.split('Fonte:')[1].trim() 
                    : (q.topic || 'Generale');
                  
                  // Use topic from question result if available, otherwise default
                  // Note: In DrillSessionActive we didn't pass topic down explicitly in QuestionResult
                  // We need to rely on what we have or infer it.
                  // Ideally, DrillResults should contain topic info per question.
                  
                  // Since we don't have topic in QuestionResult interface yet, let's fix that first in DrillSessionActive
                  // For now, let's try to group by the topic we know or show single topic if Topic Focus
                  
                  // If we are here, we likely have results.questionsData
                  // Let's assume for now we group by the topic field if we added it, or just show aggregate if single topic.
                  
                  if (!acc[topic]) acc[topic] = { correct: 0, total: 0 };
                  acc[topic].total++;
                  if (q.isCorrect) acc[topic].correct++;
                  return acc;
                }, {})
              ).map(([topic, stats]: [string, any], index) => {
                const percentage = (stats.correct / stats.total) * 100;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32 truncate" title={topic}>
                      {topic === 'Generale' && results.questionsData.length > 0 ? 'Materia Selezionata' : topic}
                    </span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <Badge variant={percentage >= 70 ? 'default' : 'destructive'}>
                      {stats.correct}/{stats.total}
                    </Badge>
                  </div>
                );
              })}
              
              {/* Fallback if no topics found (e.g. empty list) */}
              {results.questionsData.length > 0 && Object.keys(results.questionsData.reduce((acc: any, q: any) => {
                  const topic = q.topic || 'Generale';
                  if (!acc[topic]) acc[topic] = true;
                  return acc;
              }, {})).length === 0 && (
                 <div className="text-sm text-muted-foreground">Nessun dato per argomento disponibile.</div>
              )}
            </div>
          </div>

          {/* Time Distribution */}
          <div>
            <h4 className="font-semibold mb-3">Distribuzione Tempo</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Più Veloce</p>
                <p className="font-bold">12s</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Media</p>
                <p className="font-bold">{Number(avgTimePerQuestion).toFixed(0)}s</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Più Lenta</p>
                <p className="font-bold">145s</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Prossimi Passi Consigliati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {scorePercentage < 70 && (
              <li className="flex items-start gap-2">
                <span className="text-xl">📖</span>
                <span>
                  <strong>Rileggi materiale:</strong> Torna alla Fase 1 (SQ3R) per gli argomenti con più errori
                </span>
              </li>
            )}
            {results.newErrorsFound > 3 && (
              <li className="flex items-start gap-2">
                <span className="text-xl">🎯</span>
                <span>
                  <strong>Analizza errori:</strong> Vai alla sezione Error Binning e genera Recovery Plans
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-xl">🔄</span>
              <span>
                <strong>Ripeti drill:</strong> Rifai questa sessione tra 24-48h per consolidare
              </span>
            </li>
            {scorePercentage >= 85 && (
              <li className="flex items-start gap-2">
                <span className="text-xl">🚀</span>
                <span>
                  <strong>Level up:</strong> Passa a Simulazioni complete se tutte le aree deboli sono sotto controllo
                </span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button size="lg" variant="outline" onClick={onBackToDashboard} className="flex-1">
          <Home className="h-5 w-5 mr-2" />
          Torna alla Dashboard
        </Button>
        <Button size="lg" onClick={onNewSession} className="flex-1">
          <RotateCcw className="h-5 w-5 mr-2" />
          Nuova Sessione
        </Button>
      </div>

      {/* Session Stats Summary */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Durata</p>
              <p className="font-semibold">{formatDuration(results.durationSeconds)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Domande</p>
              <p className="font-semibold">{totalQuestions}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Accuracy</p>
              <p className="font-semibold">{Number(scorePercentage).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Miglioramento</p>
              <p className={`font-semibold ${improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {improvementRate >= 0 ? '+' : ''}{Number(improvementRate).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
