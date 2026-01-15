// ============================================================================
// REVIEW CALENDAR PAGE
// File: client/src/pages/concorsi/fase3/ReviewCalendarPage.tsx
// Calendario SRS con review items giornalieri
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useFase3 } from '@/contexts/Fase3Context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Clock,
  Target
} from 'lucide-react';
import SRSReviewCard from '@/components/fase3/SRSReviewCard';

export default function ReviewCalendarPage() {
  const [, params] = useRoute("/concorsi/:concorsoId/fase3/review");
  const concorsoId = params?.concorsoId;
  const [, setLocation] = useLocation();
  const { srsItemsDueToday, fetchSRSItemsDueToday, reviewSRSItem, refreshAll } = useFase3();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [calendarData, setCalendarData] = useState<any[]>([]);

  useEffect(() => {
    if (concorsoId) {
      fetchSRSItemsDueToday(concorsoId);
      fetchCalendar();
    }
  }, [concorsoId]);

  const fetchCalendar = async () => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/srs/calendar`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarData(data);
      }
    } catch (error) {
      console.error('Errore fetch calendar:', error);
    }
  };

  const handleReview = async (itemId: number, rating: number) => {
    return await reviewSRSItem(concorsoId || '', itemId, rating);
  };

  const handleComplete = () => {
    setCompletedCount(completedCount + 1);
    if (currentItemIndex < srsItemsDueToday.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // Tutte le review completate
      refreshAll(concorsoId || '');
    }
  };

  const handleBackToDashboard = () => {
    setLocation(`/concorsi/${concorsoId}/fase3`);
  };

  const currentItem = srsItemsDueToday[currentItemIndex];
  const allCompleted = completedCount === srsItemsDueToday.length && srsItemsDueToday.length > 0;

  // Calcola prossimi giorni
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = calendarData.find(d => d.review_date === dateStr);
      days.push({
        date,
        count: dayData?.items_count || 0,
        items: dayData?.items || []
      });
    }
    return days;
  };

  const next7Days = getNext7Days();

  if (srsItemsDueToday.length === 0 || allCompleted) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna a Fase 3
        </Button>

        <Card className="border-2 border-green-500">
          <CardContent className="py-16">
            <div className="text-center">
              <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-4xl font-bold mb-4">
                {allCompleted ? 'Review Completate! 🎉' : 'Nessuna Review Oggi'}
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                {allCompleted
                  ? `Hai completato ${completedCount} review. Ottimo lavoro!`
                  : 'Non ci sono item da rivedere oggi. Torna domani!'}
              </p>

              {/* Prossimi giorni */}
              {next7Days.some(d => d.count > 0) && (
                <div className="max-w-2xl mx-auto mb-8">
                  <h3 className="text-lg font-semibold mb-4">Prossime Review</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {next7Days.map((day, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg text-center ${
                          day.count > 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {day.date.toLocaleDateString('it-IT', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {day.date.getDate()}
                        </div>
                        <div className="text-xs font-semibold text-blue-600">
                          {day.count > 0 ? `${day.count} item` : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button size="lg" onClick={handleBackToDashboard}>
                Torna alla Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Button variant="ghost" onClick={handleBackToDashboard} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna a Fase 3
      </Button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Review Calendar - Oggi</h1>
        <p className="text-muted-foreground">
          Completa le review programmate per mantenere alta la retention
        </p>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Progresso Review</span>
            <span className="text-2xl font-bold">
              {completedCount} / {srsItemsDueToday.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${(completedCount / srsItemsDueToday.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Ancora {srsItemsDueToday.length - completedCount} item da rivedere
          </p>
        </CardContent>
      </Card>

      {/* Alert Info */}
      <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Algoritmo SM-2 (SuperMemo 2)
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Le review sono programmate con l'algoritmo SM-2 per massimizzare la retention.
          Il tuo rating (1-5) determina quando rivedrai l'item: Again = oggi, Perfect = intervallo massimo.
        </AlertDescription>
      </Alert>

      {/* Current Review */}
      {currentItem && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              Review {currentItemIndex + 1} / {srsItemsDueToday.length}
            </Badge>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className="h-4 w-4 mr-2" />
              ~2-3 min
            </Badge>
          </div>

          <SRSReviewCard
            item={currentItem}
            onReview={handleReview}
            onComplete={handleComplete}
          />
        </div>
      )}

      {/* Prossime Review (Mini Preview) */}
      {srsItemsDueToday.length > currentItemIndex + 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Prossime Review
            </CardTitle>
            <CardDescription>
              Item rimanenti da rivedere oggi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {srsItemsDueToday.slice(currentItemIndex + 1, currentItemIndex + 4).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + currentItemIndex + 2}</Badge>
                    <span className="text-sm font-medium truncate">
                      {item.item_reference || `Item #${item.item_id}`}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.item_type}
                  </Badge>
                </div>
              ))}
              {srsItemsDueToday.length > currentItemIndex + 4 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {srsItemsDueToday.length - currentItemIndex - 4} altri item
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
