import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Coffee, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Audio disponibili per meditazione
export const MEDITATION_AUDIOS = [
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

interface PomodoroTimerProps {
  workDuration?: number;
  breakDuration?: number;
  onComplete?: (type: "work" | "break") => void;
}

export function PomodoroTimer({
  workDuration = 25,
  breakDuration = 5,
  onComplete,
}: PomodoroTimerProps) {
  const { toast } = useToast();
  // Se vogliamo che il widget sia autonomo ma con audio persistente,
  // dovremmo usare il context. Tuttavia, il widget è pensato per essere una versione "mini" e indipendente in alcuni casi.
  // Dato che l'utente ha chiesto specificamente della "sezione pomodoro" (la pagina) e del cambio pagina,
  // abbiamo già risolto nel context.
  
  // Se l'utente usa il widget nella dashboard, e poi va alla pagina Pomodoro,
  // idealmente dovrebbero essere lo stesso timer.
  
  // Per ora, lasciamo il widget indipendente (come richiesto in origine) ma con la sua logica audio locale.
  // Se l'utente vuole che il widget continui a suonare mentre naviga via dalla dashboard, 
  // allora anche il widget deve usare il context globale.
  
  // MODIFICA: Per coerenza, se il widget è montato, usa il context globale se disponibile?
  // No, manteniamo la logica locale per evitare conflitti se non siamo pronti a un refactor completo.
  // Ma rimuoviamo il cleanup aggressivo che ferma l'audio se si vuole che continui?
  // No, l'utente ha detto "la musica si blocca" come problema se cambia pagina.
  // Se cambia pagina, il componente viene smontato -> cleanup -> stop audio.
  
  // L'UNICO modo per far continuare la musica è usare il Context Globale (che non viene smontato).
  // Abbiamo già spostato l'audio nel PomodoroContext e aggiornato PomodoroPage per usarlo.
  
  // Se l'utente usa il Widget (nella Dashboard), e poi va via, il widget si smonta.
  // Se vogliamo che la musica del widget continui, il widget deve usare il context.
  
  // Proviamo a vedere se possiamo usare il context qui.
  /*
  import { usePomodoro } from '@/contexts/PomodoroContext';
  const pomodoro = usePomodoro();
  */
  // Se usiamo il context, ignoriamo le props locali?
  
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  // Audio state
  const [backgroundAudio, setBackgroundAudio] = useState<string>('none');
  const [audioVolume, setAudioVolume] = useState(0.3);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State per collassare/espandere
  const [isExpanded, setIsExpanded] = useState(false);

  const totalTime = isBreak ? breakDuration * 60 : workDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
    
    // Stop audio on reset
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
    }
  }, [isBreak, breakDuration, workDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const switchMode = () => {
    const newIsBreak = !isBreak;
    setIsBreak(newIsBreak);
    setTimeLeft(newIsBreak ? breakDuration * 60 : workDuration * 60);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!isBreak) {
            setSessions((s) => s + 1);
          }
          onComplete?.(isBreak ? "break" : "work");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isBreak, onComplete]);

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
      // Se il widget è smontato, vogliamo fermare l'audio?
      // Se l'utente vuole persistenza, dovrebbe usare la pagina Pomodoro (che usa Context).
      // Il widget è locale. Quindi SI, fermiamo l'audio.
      // Altrimenti avremmo due audio che suonano se l'utente apre la pagina Pomodoro mentre il widget suonava.
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [backgroundAudio, isRunning, customAudioFile]);

  // Aggiorna volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  return (
    <Card className={`w-full max-w-xs transition-all duration-300 ${isExpanded ? '' : 'bg-card/50 hover:bg-card'}`} data-testid="pomodoro-timer">
      <CardContent className="p-4">
        {/* Header compatto sempre visibile */}
        <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isBreak ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                    {isBreak ? <Coffee className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </div>
                <div>
                    <div className="font-mono font-bold text-xl">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {isBreak ? "Pausa" : "Focus"}
                        {isAudioPlaying && <Volume2 className="h-3 w-3 text-purple-500 animate-pulse" />}
                    </div>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={isExpanded ? "Collapse timer" : "Expand timer"}
                aria-expanded={isExpanded}
            >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
        </div>

        {/* Contenuto espanso */}
        {isExpanded && (
            <div className="mt-6 text-center animate-in slide-in-from-top-2 duration-200">
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                strokeLinecap="round"
                className={isBreak ? "text-green-500" : "text-primary"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
              {/* Audio Indicator */}
              {isAudioPlaying && (
                <div className="mt-1 flex items-center gap-1">
                  <Volume2 className="h-3 w-3 text-purple-600 animate-pulse" />
                  <span className="text-[10px] text-purple-600 font-medium">Audio ON</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={reset}
              data-testid="button-reset-timer"
              aria-label="Reset timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={toggleTimer}
              data-testid="button-toggle-timer"
              aria-label={isRunning ? "Pause timer" : "Start timer"}
            >
              {isRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={switchMode}
              data-testid="button-switch-mode"
              aria-label={isBreak ? "Switch to focus mode" : "Switch to break mode"}
            >
              <Coffee className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Sessioni completate: <span className="font-semibold">{sessions}</span>
          </p>

          {/* Audio Controls */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold">Audio Background</h3>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                value={backgroundAudio}
                onValueChange={setBackgroundAudio}
                disabled={isRunning}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Scegli audio..." />
                </SelectTrigger>
                <SelectContent>
                  {MEDITATION_AUDIOS.map((audio) => (
                    <SelectItem key={audio.id} value={audio.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{audio.icon}</span>
                        <span>{audio.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span>🎵</span>
                      <span>Carica Audio</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {backgroundAudio === 'custom' && (
                <div className="space-y-1">
                  <Input
                    type="file"
                    accept="audio/*"
                    className="h-8 text-xs"
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
                </div>
              )}

              {backgroundAudio !== 'none' && (
                <div className="flex items-center gap-2">
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <Volume2 className="h-3 w-3 text-purple-600" />
                </div>
              )}
            </div>
          </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
