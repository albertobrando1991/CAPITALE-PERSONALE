import { useState } from 'react';
import { Wind, Droplets, Moon, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBenessere } from '@/contexts/BenessereContext';
import { useLocation } from 'wouter';

export default function BenessereWidget() {
  const {
    stats,
    isWidgetMinimized,
    toggleWidget,
    addGlass,
    startBreathing
  } = useBenessere();
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !stats) return null;

  // Minimizzato
  if (isWidgetMinimized) {
    return (
      <div className="fixed bottom-24 right-6 z-50">
        <Card className="w-48 shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center gap-1">
                🧘 Benessere
              </h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={toggleWidget}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsVisible(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  {stats.hydration.glasses_today}/{stats.hydration.target_today}
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-purple-500" />
                  {stats.breathing.sessions_today}
                </span>
              </div>

              {stats.sleep.hours_last_night && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Moon className="h-3 w-3" />
                  {stats.sleep.hours_last_night}h
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Espanso
  return (
    <div className="fixed bottom-24 right-6 z-50 w-80">
      <Card className="shadow-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              🧘 Centro Benessere
            </h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={toggleWidget}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hydration */}
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  Idratazione Oggi
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {stats.hydration.glasses_today}/{stats.hydration.target_today} 🥤
                </span>
              </div>
              <Progress
                value={stats.hydration.percentage}
                className="h-2 mb-2"
              />
              <Button
                onClick={addGlass}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                +1 Bicchiere
              </Button>
            </div>

            {/* Box Breathing */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Wind className="h-4 w-4 text-purple-600" />
                  Box Breathing
                </span>
                <span className="text-sm font-bold text-purple-600">
                  {stats.breathing.sessions_today} oggi
                </span>
              </div>
              {stats.breathing.cycles_today > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {stats.breathing.cycles_today} cicli completati
                </p>
              )}
              <Button
                onClick={startBreathing}
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                ▶ Inizia Sessione
              </Button>
            </div>

            {/* Sleep */}
            {stats.sleep.hours_last_night && (
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-600" />
                    Sonno Stanotte
                  </span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">
                      {stats.sleep.hours_last_night}h
                    </div>
                    {stats.sleep.quality_last_night && (
                      <div className="text-xs text-muted-foreground">
                        {'⭐'.repeat(stats.sleep.quality_last_night)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reframing */}
            {stats.reframing.count_this_week > 0 && (
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <p className="text-xs text-center text-muted-foreground">
                  💬 {stats.reframing.count_this_week} reframe questa settimana
                </p>
              </div>
            )}
          </div>

          {/* CTA Dashboard */}
          <Button
            onClick={() => navigate('/benessere')}
            variant="outline"
            size="sm"
            className="w-full mt-3"
          >
            Dashboard Completa →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}