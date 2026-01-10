import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play, Pause, RotateCcw, Settings, X, Maximize2, Minimize2,
  Clock, Coffee, Brain, Shuffle, ChevronUp, ChevronDown
} from 'lucide-react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function PomodoroWidget() {
  const [, setLocation] = useLocation();
  const pomodoro = usePomodoro();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = pomodoro.isPausa
    ? ((pomodoro.durataPausaBreve * 60 - pomodoro.timeRemaining) / (pomodoro.durataPausaBreve * 60)) * 100
    : ((pomodoro.durataLavoro * 60 - pomodoro.timeRemaining) / (pomodoro.durataLavoro * 60)) * 100;

  const currentMateria = pomodoro.interleavingEnabled && pomodoro.selectedMaterie.length > 0
    ? pomodoro.selectedMaterie[pomodoro.currentMateriaIndex]
    : null;

  // Fetch materie per settings
  const { data: concorsi = [] } = useQuery({
    queryKey: ['/api/concorsi'],
  });

  const { data: materie = [] } = useQuery({
    queryKey: ['/api/sq3r/materie', concorsi[0]?.id],
    queryFn: async () => {
      if (!concorsi[0]?.id) return [];
      const res = await apiRequest('GET', `/api/sq3r/materie?concorsoId=${concorsi[0].id}`);
      return res.json();
    },
    enabled: concorsi.length > 0,
  });

  // Widget Minimized (Mini Timer)
  if (pomodoro.isWidgetMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card
          className="p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary"
          onClick={pomodoro.toggleWidget}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="h-8 w-8 text-primary" />
              {pomodoro.isRunning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <div className="font-mono font-bold text-xl">
                {formatTime(pomodoro.timeRemaining)}
              </div>
              <div className="text-xs text-muted-foreground">
                {pomodoro.isPausa ? 'Pausa' : 'Focus'}
              </div>
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  // Widget Expanded (Full Timer)
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 w-96">
        <Card className="border-2 border-primary shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Timer Pomodoro</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLocation('/pomodoro')}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={pomodoro.toggleWidget}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Status */}
            <div className="flex justify-center">
              <Badge variant={pomodoro.isPausa ? "secondary" : "default"}>
                {pomodoro.isPausa ? (
                  <>
                    <Coffee className="h-3 w-3 mr-1" />
                    Pausa
                  </>
                ) : (
                  <>
                    <Brain className="h-3 w-3 mr-1" />
                    Focus
                  </>
                )}
              </Badge>
            </div>

            {/* Materia Corrente */}
            {pomodoro.interleavingEnabled && currentMateria && !pomodoro.isPausa && (
              <div className="flex items-center justify-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-sm">
                <Shuffle className="h-3 w-3 text-indigo-600" />
                <span className="text-lg">{currentMateria.icona}</span>
                <span className="font-semibold">{currentMateria.nome}</span>
              </div>
            )}

            {/* Timer */}
            <div className="text-center">
              <div className="text-5xl font-mono font-bold mb-2">
                {formatTime(pomodoro.timeRemaining)}
              </div>
              <Progress value={progressPercentage} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {pomodoro.isPausa ? 'Tempo di pausa' : 'Tempo di concentrazione'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={pomodoro.isRunning ? pomodoro.pauseTimer : pomodoro.startTimer}
                className="flex-1"
              >
                {pomodoro.isRunning ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pausa
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Avvia
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={pomodoro.resetTimer}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            {/* Stats Mini */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-muted rounded">
                <div className="font-bold text-lg">{pomodoro.totalePomodoroOggi}</div>
                <div className="text-muted-foreground">Oggi</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="font-bold text-lg">{pomodoro.cicliCompletati}</div>
                <div className="text-muted-foreground">Sessione</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Impostazioni Pomodoro</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Durate */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Lavoro (min)</Label>
                <Input
                  type="number"
                  value={pomodoro.durataLavoro}
                  onChange={e => pomodoro.updateSettings({ durataLavoro: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Pausa (min)</Label>
                <Input
                  type="number"
                  value={pomodoro.durataPausaBreve}
                  onChange={e => pomodoro.updateSettings({ durataPausaBreve: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Pausa Lunga</Label>
                <Input
                  type="number"
                  value={pomodoro.durataPausaLunga}
                  onChange={e => pomodoro.updateSettings({ durataPausaLunga: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Interleaving */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Modalità Interleaving</Label>
                <Switch
                  checked={pomodoro.interleavingEnabled}
                  onCheckedChange={pomodoro.setInterleavingEnabled}
                  // Removed disabled prop here as well to be consistent
                />
              </div>

              {pomodoro.interleavingEnabled && (
                <div className="space-y-2">
                  <Label className="text-xs">Materie da alternare</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {materie.map((materia: any) => {
                      const isSelected = pomodoro.selectedMaterie.some(m => m.id === materia.id);
                      return (
                        <button
                          key={materia.id}
                          onClick={() => {
                            if (isSelected) {
                              pomodoro.setSelectedMaterie(
                                pomodoro.selectedMaterie.filter(m => m.id !== materia.id)
                              );
                            } else {
                              pomodoro.setSelectedMaterie([
                                ...pomodoro.selectedMaterie,
                                { id: materia.id, nome: materia.nomeMateria, icona: materia.icona }
                              ]);
                            }
                          }}
                          className={`p-2 rounded border-2 text-xs text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span>{materia.icona}</span>
                            <span className="truncate">{materia.nomeMateria}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => setIsSettingsOpen(false)}
            >
              Salva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}