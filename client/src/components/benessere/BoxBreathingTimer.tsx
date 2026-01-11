import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Wind, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBenessere } from '@/contexts/BenessereContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type Phase = 'inhale' | 'hold_full' | 'exhale' | 'hold_empty';

const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'INSPIRA',
  hold_full: 'TRATTIENI',
  exhale: 'ESPIRA',
  hold_empty: 'TRATTIENI'
};

const PHASE_COLORS: Record<Phase, string> = {
  inhale: 'from-blue-400 to-blue-600',
  hold_full: 'from-purple-400 to-purple-600',
  exhale: 'from-orange-400 to-orange-600',
  hold_empty: 'from-gray-400 to-gray-600'
};

// Audio disponibili per meditazione
const MEDITATION_AUDIOS = [
  {
    id: 'none',
    name: 'Nessun Audio',
    url: null,
    icon: '🔇'
  },
  {
    id: 'rain',
    name: 'Pioggia Leggera',
    url: '/audio/rain.ogg',
    icon: '🌧️'
  },
  {
    id: 'ocean',
    name: 'Onde Oceaniche',
    url: '/audio/ocean.ogg',
    icon: '🌊'
  },
  {
    id: 'forest',
    name: 'Foresta Naturale',
    url: '/audio/forest.ogg',
    icon: '🌲'
  },
  {
    id: 'space',
    name: 'Ambient Spaziale',
    url: '/audio/space.ogg',
    icon: '🌌'
  },
  {
    id: 'piano',
    name: 'Piano Rilassante',
    url: '/audio/piano.mp3',
    icon: '🎹'
  }
];

import { Input } from '@/components/ui/input';

export default function BoxBreathingTimer() {
  const { toast } = useToast();
  const { refreshStats } = useBenessere();

  // Settings
  const [breathDuration, setBreathDuration] = useState(4); // secondi per fase
  const [targetCycles, setTargetCycles] = useState(10);
  const [context, setContext] = useState<string>('break');

  // Audio meditazione state
  const [backgroundAudio, setBackgroundAudio] = useState<string>('none');
  const [audioVolume, setAudioVolume] = useState(0.3);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [phaseTimer, setPhaseTimer] = useState(breathDuration);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Animation
  const [scale, setScale] = useState(1);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Phase progression
  const phases: Phase[] = ['inhale', 'hold_full', 'exhale', 'hold_empty'];
  
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          // Fase completata, passa alla prossima
          const currentIndex = phases.indexOf(currentPhase);
          const nextIndex = (currentIndex + 1) % phases.length;
          const nextPhase = phases[nextIndex];

          setCurrentPhase(nextPhase);

          // Se completiamo un ciclo completo (dopo hold_empty)
          if (nextPhase === 'inhale') {
            setCyclesCompleted((c) => c + 1);
            
            // Check se abbiamo raggiunto il target
            if (cyclesCompleted + 1 >= targetCycles) {
              handleComplete();
            }
          }

          // Play sound
          playPhaseSound(nextPhase);

          return breathDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentPhase, breathDuration, cyclesCompleted, targetCycles]);

  // Gestione audio di sottofondo
  useEffect(() => {
    if (backgroundAudio === 'none') {
      // Stop audio se "nessun audio" selezionato
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsAudioPlaying(false);
      return;
    }

    let audioUrl: string | null = null;

    if (backgroundAudio === 'custom') {
      if (customAudioFile) {
        audioUrl = URL.createObjectURL(customAudioFile);
      }
    } else {
      const selectedAudio = MEDITATION_AUDIOS.find(a => a.id === backgroundAudio);
      if (selectedAudio) {
        audioUrl = selectedAudio.url;
      }
    }

    if (!audioUrl) return;

    // Crea e configura audio element se necessario o se URL cambiato
    // Nota: per i blob URL (custom), ogni createObjectURL crea un nuovo URL, quindi il confronto src potrebbe fallire se non gestito.
    // Ma qui stiamo ricreando l'URL solo se customAudioFile cambia o se entriamo in questo blocco.
    // Per semplicità, se è custom, ricreiamo se l'attuale non è un blob o se non esiste.
    
    let shouldUpdateAudio = false;
    if (!audioRef.current) {
      shouldUpdateAudio = true;
    } else if (backgroundAudio !== 'custom' && audioRef.current.src !== audioUrl) {
      shouldUpdateAudio = true;
    } else if (backgroundAudio === 'custom' && !audioRef.current.src.startsWith('blob:')) {
      shouldUpdateAudio = true;
    }

    if (shouldUpdateAudio) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = audioVolume;
    }

    // Play/Pause basato su isRunning
    if (isRunning && !isAudioPlaying) {
      audioRef.current?.play().then(() => {
        setIsAudioPlaying(true);
      }).catch(err => {
        console.error('Errore play audio:', err);
        toast({
          title: "Errore Audio",
          description: "Non è stato possibile riprodurre l'audio di sottofondo",
          variant: "destructive"
        });
      });
    } else if (!isRunning && isAudioPlaying) {
      audioRef.current?.pause();
      setIsAudioPlaying(false);
    }

    // Cleanup on unmount
    return () => {
      // Cleanup audio on unmount to prevent playing in background
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [backgroundAudio, isRunning, customAudioFile]);

  // Aggiorna volume quando cambia lo slider
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Animation scaling effect
  useEffect(() => {
    if (currentPhase === 'inhale') {
      setScale(1.5);
    } else if (currentPhase === 'exhale') {
      setScale(0.8);
    } else {
      setScale(currentPhase === 'hold_full' ? 1.5 : 0.8);
    }
  }, [currentPhase]);

  const playPhaseSound = (phase: Phase) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Frequenze diverse per ogni fase
    const frequencies: Record<Phase, number> = {
      inhale: 440,
      hold_full: 523,
      exhale: 349,
      hold_empty: 294
    };

    oscillator.frequency.value = frequencies[phase];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const handleStart = () => {
    setIsRunning(true);
    setSessionStartTime(new Date());
    
    if (cyclesCompleted === 0) {
      toast({
        title: "🧘 Sessione Avviata",
        description: `Respira con il ritmo 4-4-4-4. Completa ${targetCycles} cicli.`
      });
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('inhale');
    setPhaseTimer(breathDuration);
    setCyclesCompleted(0);
    setSessionStartTime(null);
    setScale(1);

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
    }
  };

  const handleComplete = async () => {
    setIsRunning(false);
    
    const durationSeconds = sessionStartTime 
      ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) 
      : targetCycles * breathDuration * 4;

    // Salva sessione nel DB
    try {
      const res = await fetch('/api/benessere/breathing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startedAt: sessionStartTime?.toISOString(),
          endedAt: new Date().toISOString(),
          cyclesCompleted: targetCycles,
          durationSeconds,
          context
        })
      });

      if (res.ok) {
        await refreshStats();
        
        toast({
          title: "✅ Sessione Completata!",
          description: `Hai completato ${targetCycles} cicli in ${Math.floor(durationSeconds / 60)} minuti. Ben fatto!`,
          duration: 5000
        });

        // Reset per nuova sessione
        setTimeout(handleReset, 2000);
      }
    } catch (error) {
      console.error('Errore salvataggio sessione:', error);
      toast({
        title: "Sessione Completata",
        description: "Non è stato possibile salvare i dati, ma hai fatto un ottimo lavoro!",
        variant: "destructive"
      });
    }
  };

  const progressPercentage = ((cyclesCompleted / targetCycles) * 100);
  const phaseProgressPercentage = ((breathDuration - phaseTimer) / breathDuration) * 100;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Wind className="h-6 w-6 text-purple-600" />
            Box Breathing Timer
          </CardTitle>
          <CardDescription>
            Tecnica Navy SEALs per il controllo dello stress • Ritmo 4-4-4-4
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Impostazioni (visibili solo quando non sta girando) */}
          {!isRunning && cyclesCompleted === 0 && (
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Durata Fase (sec)</label>
                <Select 
                  value={breathDuration.toString()} 
                  onValueChange={(val) => { 
                    setBreathDuration(Number(val)); 
                    setPhaseTimer(Number(val)); 
                  }} 
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 secondi</SelectItem>
                    <SelectItem value="4">4 secondi (consigliato)</SelectItem>
                    <SelectItem value="5">5 secondi</SelectItem>
                    <SelectItem value="6">6 secondi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Cicli Target</label>
                <Select 
                  value={targetCycles.toString()} 
                  onValueChange={(val) => setTargetCycles(Number(val))} 
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 cicli (~2 min)</SelectItem>
                    <SelectItem value="10">10 cicli (~4 min)</SelectItem>
                    <SelectItem value="15">15 cicli (~6 min)</SelectItem>
                    <SelectItem value="20">20 cicli (~8 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Contesto</label>
                <Select 
                  value={context} 
                  onValueChange={setContext} 
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_study">Prima di studiare</SelectItem>
                    <SelectItem value="break">Pausa studio</SelectItem>
                    <SelectItem value="pre_exam">Prima dell'esame</SelectItem>
                    <SelectItem value="stress_relief">Riduzione stress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* NUOVA SEZIONE: Controlli Audio Meditazione */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Volume2 className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-purple-900">Audio Meditazione</h3>
              </div>
              {isAudioPlaying && (
                <Badge className="bg-green-500 animate-pulse">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    In riproduzione
                  </div>
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {/* Selezione Audio */}
              <div className="space-y-2">
                <Label htmlFor="backgroundAudio" className="text-sm">
                  Scegli Audio di Sottofondo
                </Label>
                <Select
                  value={backgroundAudio}
                  onValueChange={setBackgroundAudio}
                  disabled={isRunning}
                >
                  <SelectTrigger id="backgroundAudio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDITATION_AUDIOS.map((audio) => (
                      <SelectItem key={audio.id} value={audio.id}>
                        <div className="flex items-center gap-2">
                          <span>{audio.icon}</span>
                          <span>{audio.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <span>🎵</span>
                        <span>Carica il Tuo Audio</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Audio Upload */}
              {backgroundAudio === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customAudio" className="text-sm">
                    Carica il Tuo Audio
                  </Label>
                  <Input
                    id="customAudio"
                    type="file"
                    accept="audio/*"
                    disabled={isRunning}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCustomAudioFile(file);
                        toast({
                          title: "Audio Caricato",
                          description: file.name
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formati supportati: MP3, WAV, OGG
                  </p>
                </div>
              )}

              {/* Volume Slider */}
              {backgroundAudio !== 'none' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="audioVolume" className="text-sm">
                      Volume Audio
                    </Label>
                    <span className="text-sm font-semibold text-purple-600">
                      {Math.round(audioVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <input
                      id="audioVolume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <Volume2 className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              )}

              {/* Info Box */}
              {backgroundAudio !== 'none' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="text-blue-900">
                    <strong>💡 Suggerimento:</strong> L'audio partirà automaticamente quando avvii la sessione
                    e si fermerà quando metti in pausa o completi i cicli.
                  </p>
                </div>
              )}

              {/* Preview Button (solo se non sta girando) */}
              {backgroundAudio !== 'none' && !isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (audioRef.current) {
                      if (isAudioPlaying) {
                        audioRef.current.pause();
                        setIsAudioPlaying(false);
                      } else {
                        audioRef.current.play().then(() => {
                          setIsAudioPlaying(true);
                        }).catch(err => {
                          console.error('Errore preview audio:', err);
                        });
                      }
                    }
                  }}
                >
                  {isAudioPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Ferma Anteprima
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Anteprima Audio
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Visualizzazione Cerchio Animato */}
          <div className="flex flex-col items-center justify-center py-8">
            <div 
              className={`w-64 h-64 rounded-full bg-gradient-to-br ${PHASE_COLORS[currentPhase]} 
                         shadow-2xl flex items-center justify-center transition-all duration-[${breathDuration * 1000}ms] ease-in-out`} 
              style={{ 
                transform: `scale(${scale})`, 
                transition: `transform ${breathDuration}s ease-in-out` 
              }} 
            >
              <div className="text-center text-white">
                <div className="text-4xl font-bold mb-2">
                  {PHASE_LABELS[currentPhase]}
                </div>
                <div className="text-6xl font-bold">
                  {phaseTimer}
                </div>
                <div className="text-sm mt-2 opacity-80">
                  secondi
                </div>

                {/* NUOVO: Indicatore Audio Attivo */}
                {isAudioPlaying && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    <span className="text-xs">Audio attivo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progresso Fase */}
            <div className="w-64 mt-4">
              <Progress value={phaseProgressPercentage} className="h-2" />
            </div>
          </div>

          {/* Statistiche Sessione */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Cicli Completati</p>
              <p className="text-3xl font-bold text-purple-600">
                {cyclesCompleted} / {targetCycles}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Progresso Totale</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(progressPercentage)}%
              </p>
            </div>
          </div>

          <Progress value={progressPercentage} className="h-3" />

          {/* Controlli */}
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <Button 
                onClick={handleStart} 
                size="lg" 
                className="bg-purple-600 hover:bg-purple-700 gap-2" 
              >
                <Play className="h-5 w-5" />
                {cyclesCompleted > 0 ? 'Riprendi' : 'Inizia Sessione'}
              </Button>
            ) : (
              <Button 
                onClick={handlePause} 
                size="lg" 
                variant="outline" 
                className="gap-2" 
              >
                <Pause className="h-5 w-5" />
                Pausa
              </Button>
            )}

            <Button 
              onClick={handleReset} 
              size="lg" 
              variant="outline" 
              className="gap-2" 
            >
              <RotateCcw className="h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">💡 Come Funziona</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Inspira profondamente dal naso per {breathDuration} secondi</li>
              <li>Trattieni il respiro (apnea piena) per {breathDuration} secondi</li>
              <li>Espira lentamente dalla bocca per {breathDuration} secondi</li>
              <li>Trattieni il respiro (apnea vuota) per {breathDuration} secondi</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">
              Seguendo il cerchio che si espande e contrae, sincronizza il tuo respiro.
              I suoni ti guideranno ad ogni cambio di fase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}