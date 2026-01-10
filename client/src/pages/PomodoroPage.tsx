import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Play, Pause, RotateCcw, Settings,
  Clock, Coffee, CheckCircle2, Shuffle, Brain, AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { usePomodoro } from '@/contexts/PomodoroContext';

export default function PomodoroPage() {
  const [, setLocation] = useLocation();
  const pomodoro = usePomodoro(); // Usa il context globale invece di state locale
  const { toast } = useToast();

  // Settings
  // Rimosso useState locale per usare pomodoro.* dal context
  
  // Dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch concorsi e materie
  const { data: concorsi = [] } = useQuery({
    queryKey: ['/api/concorsi'],
  });

  const selectedConcorsoId = concorsi[0]?.id;

  const { data: materie = [] } = useQuery({
    queryKey: ['/api/sq3r/materie', selectedConcorsoId],
    queryFn: async () => {
      if (!selectedConcorsoId) return [];
      const res = await apiRequest('GET', `/api/sq3r/materie?concorsoId=${selectedConcorsoId}`);
      return res.json();
    },
    enabled: !!selectedConcorsoId,
  });

  // Timer Logic rimosso perché gestito dal Context

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

  const toggleMateriaSelection = (id: string, nome: string, icona: string) => {
    const isSelected = pomodoro.selectedMaterie.some(m => m.id === id);
    if (isSelected) {
      pomodoro.setSelectedMaterie(pomodoro.selectedMaterie.filter(m => m.id !== id));
    } else {
      pomodoro.setSelectedMaterie([...pomodoro.selectedMaterie, { id, nome, icona }]);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Timer Pomodoro</h1>
          <p className="text-muted-foreground">Tecnica scientifica per la massima concentrazione</p>
        </div>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Impostazioni Pomodoro</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Durate */}
              <div className="space-y-4">
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
                <div>
                  <Label className="text-xs">Cicli prima della pausa lunga</Label>
                  <Input
                    type="number"
                    value={pomodoro.cicliPrimaLungaPausa}
                    onChange={e => pomodoro.updateSettings({ cicliPrimaLungaPausa: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  pomodoro.resetTimer();
                  setIsSettingsOpen(false);
                  toast({ title: "Impostazioni salvate" });
                }}
              >
                Salva e Applica
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Timer Card */}
      <Card className="mb-8 border-2 border-primary">
        <CardContent className="pt-8">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <Badge
              variant={pomodoro.isPausa ? "secondary" : "default"}
              className="text-lg px-6 py-2"
            >
              {pomodoro.isPausa ? (
                <>
                  <Coffee className="h-4 w-4 mr-2" />
                  Pausa
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Focus
                </>
              )}
            </Badge>
          </div>

          {/* Materia Corrente (se Interleaving attivo) */}
          {pomodoro.interleavingEnabled && currentMateria && !pomodoro.isPausa && (
            <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200">
              <Shuffle className="h-5 w-5 text-indigo-600" />
              <span className="text-2xl">{currentMateria.icona}</span>
              <span className="font-semibold text-lg">{currentMateria.nome}</span>
              <Badge variant="outline">
                {pomodoro.currentMateriaIndex + 1}/{pomodoro.selectedMaterie.length}
              </Badge>
            </div>
          )}

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-8xl font-mono font-bold mb-4">
              {formatTime(pomodoro.timeRemaining)}
            </div>
            <Progress value={progressPercentage} className="h-3 mb-4" />
            <p className="text-sm text-muted-foreground">
              {pomodoro.isPausa
                ? `Pausa ${pomodoro.cicliCompletati % pomodoro.cicliPrimaLungaPausa === 0 && pomodoro.cicliCompletati > 0 ? 'lunga' : 'breve'}`
                : 'Tempo di concentrazione'
              }
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              onClick={pomodoro.isRunning ? pomodoro.pauseTimer : pomodoro.startTimer}
              className="px-8"
            >
              {pomodoro.isRunning ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pausa
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Avvia
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={pomodoro.resetTimer}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Cicli Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pomodoro.totalePomodoroOggi}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Cicli Questa Sessione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pomodoro.cicliCompletati}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Prossima Pausa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {pomodoro.cicliPrimaLungaPausa - (pomodoro.cicliCompletati % pomodoro.cicliPrimaLungaPausa)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interleaving Section */}
      <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5 text-indigo-600" />
                Modalità Interleaving
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Alterna automaticamente tra materie diverse ogni Pomodoro
              </p>
            </div>
            <Switch
              checked={pomodoro.interleavingEnabled}
              onCheckedChange={pomodoro.setInterleavingEnabled}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Box */}
          {!pomodoro.interleavingEnabled && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold mb-1">Cos'è l'Interleaving?</p>
                  <p className="text-muted-foreground">
                    Invece di studiare 4 ore di una sola materia (Blocking),
                    l'Interleaving alterna materie diverse ogni 25 minuti.
                    <strong> Scientificamente provato: +40% ritenzione!</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selezione Materie */}
          {pomodoro.interleavingEnabled && (
            <div className="space-y-3">
              <Label className="font-semibold">
                Seleziona materie da alternare (2-6)
              </Label>
              
              {materie.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>Nessuna materia disponibile.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLocation(`/concorsi/${selectedConcorsoId}/fase1`)}
                  >
                    Aggiungi Materie
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {materie.map((materia: any) => (
                    <button
                      key={materia.id}
                      onClick={() => toggleMateriaSelection(materia.id, materia.nomeMateria, materia.icona)}
                      disabled={pomodoro.isRunning}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        pomodoro.selectedMaterie.some(m => m.id === materia.id)
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${pomodoro.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{materia.icona}</span>
                        <span className="text-sm font-medium truncate">
                          {materia.nomeMateria}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Preview Rotazione */}
              {pomodoro.selectedMaterie.length >= 2 && (
                <Card className="bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>📅 Sequenza Rotazione</span>
                      <Badge variant="outline">{pomodoro.selectedMaterie.length} materie</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pomodoro.selectedMaterie.map((selectedMateria, idx) => {
                      const isCurrent = idx === pomodoro.currentMateriaIndex && !pomodoro.isPausa;
                      return (
                        <div
                          key={selectedMateria.id}
                          className={`flex items-center gap-3 p-2 rounded text-sm ${
                            isCurrent
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300'
                              : 'bg-gray-50 dark:bg-gray-900/50'
                          }`}
                        >
                          <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <span className="text-lg">{selectedMateria.icona}</span>
                          <span className="flex-1 font-medium">{selectedMateria.nome}</span>
                          {isCurrent && (
                            <Badge className="bg-indigo-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Adesso
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
                      💡 Ogni Pomodoro (25min) passerà automaticamente alla materia successiva
                    </div>
                  </CardContent>
                </Card>
              )}

              {pomodoro.selectedMaterie.length < 2 && pomodoro.selectedMaterie.length > 0 && (
                <p className="text-sm text-center text-muted-foreground italic">
                  Seleziona almeno 2 materie per attivare l'Interleaving
                </p>
              )}
            </div>
          )}

          {/* Link Approfondimento */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation('/libreria?tab=mindset')}
          >
            <Brain className="h-4 w-4 mr-2" />
            Scopri la Scienza dell'Interleaving
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}