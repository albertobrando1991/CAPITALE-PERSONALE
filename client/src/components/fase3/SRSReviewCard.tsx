// ============================================================================
// SRS REVIEW CARD COMPONENT
// File: client/src/components/fase3/SRSReviewCard.tsx
// Card singola per review SRS item con rating SM-2
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import type { SRSItem } from '@/contexts/Fase3Context';

interface SRSReviewCardProps {
  item: SRSItem;
  onReview: (itemId: number, rating: number) => Promise<any>;
  onComplete: () => void;
}

export default function SRSReviewCard({ item, onReview, onComplete }: SRSReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showNextReview, setShowNextReview] = useState<string | null>(null);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleRating = async (rating: number) => {
    setReviewing(true);
    try {
      const result = await onReview(item.id, rating);
      setShowNextReview(result.next_review_date);
      
      // Aspetta 1.5s per mostrare feedback, poi completa
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Errore review:', error);
      setReviewing(false);
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'flashcard': return '📇 Flashcard';
      case 'quiz_topic': return '🎯 Quiz Topic';
      case 'capitolo': return '📖 Capitolo';
      case 'error_bin': return '🔴 Area Debole';
      default: return type;
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-purple-600';
    if (streak >= 5) return 'text-green-600';
    if (streak >= 3) return 'text-blue-600';
    return 'text-gray-600';
  };

  // Rating buttons config
  const ratingButtons = [
    { value: 1, label: 'Again', color: 'bg-red-500 hover:bg-red-600', icon: XCircle, desc: 'Dimenticato completamente' },
    { value: 2, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', icon: AlertTriangle, desc: 'Difficile da ricordare' },
    { value: 3, label: 'Good', color: 'bg-yellow-500 hover:bg-yellow-600', icon: CheckCircle2, desc: 'Ricordato con sforzo' },
    { value: 4, label: 'Easy', color: 'bg-green-500 hover:bg-green-600', icon: Sparkles, desc: 'Ricordato facilmente' },
    { value: 5, label: 'Perfect', color: 'bg-blue-500 hover:bg-blue-600', icon: TrendingUp, desc: 'Padronanza completa' }
  ];

  if (showNextReview) {
    return (
      <Card className="border-2 border-green-500">
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Review Completata! ✅</h3>
            <p className="text-muted-foreground mb-4">
              Prossima review programmata per:
            </p>
            <div className="text-xl font-semibold text-green-600">
              {new Date(showNextReview).toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Badge variant="outline" className="mb-2">
              {getItemTypeLabel(item.item_type)}
            </Badge>
            <CardTitle className="text-xl">
              {item.item_reference || `Item #${item.item_id}`}
            </CardTitle>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Ripetizioni</p>
            <p className="font-bold text-2xl">{item.repetitions}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="p-2 border rounded">
            <p className="text-muted-foreground text-xs">Ease</p>
            <p className="font-bold">{item.ease_factor.toFixed(2)}</p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-muted-foreground text-xs">Intervallo</p>
            <p className="font-bold">{item.interval_days}gg</p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-muted-foreground text-xs">Streak</p>
            <p className={`font-bold ${getStreakColor(item.current_streak)}`}>
              {item.current_streak}🔥
            </p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-muted-foreground text-xs">Review</p>
            <p className="font-bold">{item.total_reviews}</p>
          </div>
        </div>

        {/* Content / Reveal */}
        {!revealed ? (
          <div className="py-8">
            <Alert>
              <AlertDescription className="text-center">
                <p className="mb-4">
                  <strong>Richiama mentalmente questo argomento:</strong>
                </p>
                <p className="text-lg font-semibold mb-6">
                  {item.item_reference}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Quando sei pronto, clicca per verificare
                </p>
                <Button onClick={handleReveal} size="lg">
                  Rivela Contenuto →
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mock Content (in produzione: fetch contenuto da API) */}
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Contenuto Completo:</strong>
                <p className="mt-2">
                  {item.item_type === 'flashcard' && (
                    <>
                      <strong>Domanda:</strong> Qual è la differenza tra obbligazioni solidali e parziarie?<br />
                      <strong>Risposta:</strong> Solidale = ogni debitore risponde per l'intero; Parziaria = ciascuno per la sua quota (Art. 1292-1313 C.C.)
                    </>
                  )}
                  {item.item_type === 'quiz_topic' && (
                    <>
                      <strong>Topic:</strong> {item.item_reference}<br />
                      <strong>Concetti chiave:</strong> Distinzione tra dolo diretto, indiretto, eventuale; requisiti; differenze con colpa cosciente
                    </>
                  )}
                  {item.item_type === 'capitolo' && (
                    <>
                      <strong>Capitolo:</strong> {item.item_reference}<br />
                      <strong>Punti principali:</strong> Responsabilità aquiliana (Art. 2043), fatto illecito, nesso causale, danno risarcibile
                    </>
                  )}
                  {item.item_type === 'error_bin' && (
                    <>
                      <strong>Area Debole:</strong> {item.item_reference}<br />
                      <strong>Strategia:</strong> Rileggi Art. 1173-1218, crea schema comparativo, memorizza esempi
                    </>
                  )}
                </p>
              </AlertDescription>
            </Alert>

            {/* Rating Buttons */}
            <div>
              <p className="text-sm font-semibold mb-3 text-center">
                Quanto bene ricordi questo contenuto?
              </p>
              <div className="grid grid-cols-5 gap-2">
                {ratingButtons.map(btn => (
                  <Button
                    key={btn.value}
                    onClick={() => handleRating(btn.value)}
                    disabled={reviewing}
                    className={`${btn.color} text-white flex-col h-auto py-3`}
                    title={btn.desc}
                  >
                    <btn.icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-semibold">{btn.label}</span>
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 mt-2 text-xs text-center text-muted-foreground">
                {ratingButtons.map(btn => (
                  <div key={btn.value}>{btn.desc}</div>
                ))}
              </div>
            </div>

            {/* SM-2 Info */}
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Algoritmo SM-2:</strong> Il tuo rating determina quando rivedrai questo item.
                Again = oggi, Hard = {Math.ceil(item.interval_days * 0.5)}gg, Good = {item.interval_days}gg,
                Easy = {Math.ceil(item.interval_days * item.ease_factor)}gg, Perfect = {Math.ceil(item.interval_days * item.ease_factor * 1.3)}gg
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* History */}
        {item.last_reviewed_at && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Ultima review: {new Date(item.last_reviewed_at).toLocaleDateString('it-IT')} · 
            Rating: {item.last_rating}/5 · 
            Dimenticato: {item.times_forgotten} volte · 
            Best Streak: {item.best_streak}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
