// ============================================================================
// DRILL SESSION SUMMARY COMPONENT
// File: client/src/components/fase3/DrillSessionSummary.tsx
// Risultati finali della sessione
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import type { DrillResults } from './DrillSessionActive';

interface DrillSessionSummaryProps {
  results: DrillResults;
  onClose: () => void;
  onRetry: () => void;
}

export default function DrillSessionSummary({
  results,
  onClose,
  onRetry
}: DrillSessionSummaryProps) {
  const totalQuestions = results.correctAnswers + results.wrongAnswers + results.skippedQuestions;
  const score = (results.correctAnswers / totalQuestions) * 100;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Eccellente! Sei pronto per il prossimo livello.';
    if (score >= 70) return 'Buon lavoro! Ancora un po\' di pratica.';
    return 'Non mollare! Rivedi gli errori e riprova.';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-accent mb-4">
          <Trophy className={`h-12 w-12 ${getScoreColor(score)}`} />
        </div>
        <h2 className="text-3xl font-bold mb-2">Sessione Completata!</h2>
        <p className="text-muted-foreground">{getScoreMessage(score)}</p>
      </div>

      {/* Main Stats */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <span className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(0)}%
            </span>
            <p className="text-sm text-muted-foreground mt-1">Punteggio Finale</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-background rounded-lg border">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="font-bold text-xl">{results.correctAnswers}</div>
              <div className="text-xs text-muted-foreground">Corrette</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="font-bold text-xl">{results.wrongAnswers}</div>
              <div className="text-xs text-muted-foreground">Errate</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="font-bold text-xl">
                {Math.floor(results.durationSeconds / 60)}m {results.durationSeconds % 60}s
              </div>
              <div className="text-xs text-muted-foreground">Tempo Totale</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="font-bold text-xl">
                {results.newErrorsFound}
              </div>
              <div className="text-xs text-muted-foreground">Nuovi Errori</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button size="lg" variant="outline" className="flex-1" onClick={onRetry}>
          <RotateCcw className="h-5 w-5 mr-2" />
          Nuova Sessione
        </Button>
        <Button size="lg" className="flex-1" onClick={onClose}>
          <ArrowRight className="h-5 w-5 mr-2" />
          Torna alla Dashboard
        </Button>
      </div>

      {/* Question Review List (Simplified) */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Risposte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.questionsData.map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              {q.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{q.questionText}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  La tua risposta: <span className={q.isCorrect ? 'text-green-600' : 'text-red-600'}>{q.userAnswer}</span>
                </div>
              </div>
              <Badge variant="outline">{q.timeSpent}s</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
