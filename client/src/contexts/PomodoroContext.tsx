import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Importa le costanti audio (potrebbe essere necessario spostarle in un file shared o definire qui)
const MEDITATION_AUDIOS = [
  { id: 'none', url: null },
  { id: 'rain', url: '/audio/rain.ogg' },
  { id: 'ocean', url: '/audio/ocean.ogg' },
  { id: 'forest', url: '/audio/forest.ogg' },
  { id: 'space', url: '/audio/space.ogg' },
  { id: 'piano', url: '/audio/piano.mp3' },
];

interface PomodoroState {
  // Timer
  timeRemaining: number; // secondi
  isRunning: boolean;
  isPausa: boolean;
  cicliCompletati: number;
  totalePomodoroOggi: number;
  
  // Settings
  durataLavoro: number; // minuti
  durataPausaBreve: number;
  durataPausaLunga: number;
  cicliPrimaLungaPausa: number;
  
  // Interleaving
  interleavingEnabled: boolean;
  selectedMaterie: Array<{id: string; nome: string; icona: string}>;
  currentMateriaIndex: number;
  
  // Widget
  isWidgetMinimized: boolean;
  isWidgetExpanded: boolean;

  // Audio
  backgroundAudio: string;
  audioVolume: number;
  isAudioPlaying: boolean;
  // customAudioFile non salvato in localstorage per semplicità (richiede URL.createObjectURL che scade)
}

interface PomodoroContextType extends PomodoroState {
  // Actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  toggleWidget: () => void;
  expandWidget: () => void;
  
  // Settings
  updateSettings: (settings: Partial<PomodoroState>) => void;
  
  // Interleaving
  setInterleavingEnabled: (enabled: boolean) => void;
  setSelectedMaterie: (materie: Array<{id: string; nome: string; icona: string}>) => void;

  // Audio Actions
  setBackgroundAudio: (audioId: string) => void;
  setAudioVolume: (volume: number) => void;
  setCustomAudioFile: (file: File | null) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [customAudioFile, setCustomAudioFileState] = useState<File | null>(null);

  // Load from localStorage
  const loadState = (): PomodoroState => {
    const saved = localStorage.getItem('pomodoroState');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Reset timer se era in pausa da più di 1 ora
      const now = Date.now();
      const lastUpdate = parsed.lastUpdate || now;
      if (now - lastUpdate > 3600000) { // 1 ora
        parsed.isRunning = false;
        parsed.isAudioPlaying = false; // Reset audio playing state
      }
      // Ensure audio defaults if missing
      if (!parsed.backgroundAudio) parsed.backgroundAudio = 'none';
      if (parsed.audioVolume === undefined) parsed.audioVolume = 0.3;
      
      return parsed;
    }
    
    return {
      timeRemaining: 25 * 60,
      isRunning: false,
      isPausa: false,
      cicliCompletati: 0,
      totalePomodoroOggi: 0,
      durataLavoro: 25,
      durataPausaBreve: 5,
      durataPausaLunga: 15,
      cicliPrimaLungaPausa: 4,
      interleavingEnabled: false,
      selectedMaterie: [],
      currentMateriaIndex: 0,
      isWidgetMinimized: true,
      isWidgetExpanded: false,
      backgroundAudio: 'none',
      audioVolume: 0.3,
      isAudioPlaying: false,
    };
  };

  const [state, setState] = useState<PomodoroState>(loadState);

  // Audio Management Effect (Global)
  useEffect(() => {
    if (state.backgroundAudio === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (state.isAudioPlaying) {
        setState(prev => ({ ...prev, isAudioPlaying: false }));
      }
      return;
    }

    let audioUrl: string | null = null;

    if (state.backgroundAudio === 'custom') {
      if (customAudioFile) {
        audioUrl = URL.createObjectURL(customAudioFile);
      }
    } else {
      const selectedAudio = MEDITATION_AUDIOS.find(a => a.id === state.backgroundAudio);
      if (selectedAudio) {
        audioUrl = selectedAudio.url;
      }
    }

    if (!audioUrl) return;

    // Gestione creazione/aggiornamento audio element
    let shouldUpdateAudio = false;
    if (!audioRef.current) {
      shouldUpdateAudio = true;
    } else if (state.backgroundAudio !== 'custom' && audioRef.current.src.indexOf(audioUrl) === -1) {
      // Nota: src.indexOf check approssimativo per path relativi risolti dal browser
      shouldUpdateAudio = true;
    } else if (state.backgroundAudio === 'custom' && !audioRef.current.src.startsWith('blob:')) {
      shouldUpdateAudio = true;
    }

    if (shouldUpdateAudio) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = state.audioVolume;
    }

    // Aggiorna volume se cambiato
    if (audioRef.current && Math.abs(audioRef.current.volume - state.audioVolume) > 0.01) {
      audioRef.current.volume = state.audioVolume;
    }

    // Play/Pause logic based on timer running state
    // Se il timer è in esecuzione, l'audio deve suonare.
    if (state.isRunning && !state.isAudioPlaying) {
      audioRef.current?.play().then(() => {
        setState(prev => ({ ...prev, isAudioPlaying: true }));
      }).catch(err => {
        console.error('Errore play audio:', err);
      });
    } else if (!state.isRunning && state.isAudioPlaying) {
      audioRef.current?.pause();
      setState(prev => ({ ...prev, isAudioPlaying: false }));
    }
  }, [state.backgroundAudio, state.isRunning, state.audioVolume, customAudioFile, state.isAudioPlaying]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoroState', JSON.stringify({
      ...state,
      lastUpdate: Date.now(),
    }));
  }, [state]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.isRunning && state.timeRemaining > 0) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    } else if (state.timeRemaining === 0 && state.isRunning) {
      handleCicloCompletato();
    }
    
    return () => clearInterval(interval);
  }, [state.isRunning, state.timeRemaining]);

  // Notifica browser
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleCicloCompletato = () => {
    // Suono notifica
    const audio = new Audio('/notification.mp3'); // Opzionale
    audio.play().catch(() => {}); // Ignora errori se non c'è il file

    if (!state.isPausa) {
      // Fine Pomodoro di lavoro
      const newCicli = state.cicliCompletati + 1;
      
      // Passa alla materia successiva se Interleaving
      let nextMateriaIndex = state.currentMateriaIndex;
      let nextMateriaName = '';
      
      if (state.interleavingEnabled && state.selectedMaterie.length > 0) {
        nextMateriaIndex = (state.currentMateriaIndex + 1) % state.selectedMaterie.length;
        const nextMateria = state.selectedMaterie[nextMateriaIndex];
        nextMateriaName = `${nextMateria.icona} ${nextMateria.nome}`;
      }

      // Determina durata pausa
      const isLongBreak = newCicli % state.cicliPrimaLungaPausa === 0;
      const pausaDuration = isLongBreak ? state.durataPausaLunga : state.durataPausaBreve;
      
      setState(prev => ({
        ...prev,
        cicliCompletati: newCicli,
        totalePomodoroOggi: prev.totalePomodoroOggi + 1,
        timeRemaining: pausaDuration * 60,
        isPausa: true,
        currentMateriaIndex: nextMateriaIndex,
        isRunning: true, // Auto-start pausa
        isWidgetMinimized: false, // Espandi per mostrare notifica
      }));

      // Toast
      toast({
        title: "🍅 Pomodoro Completato!",
        description: nextMateriaName
          ? `Prossima materia: ${nextMateriaName}`
          : "Prenditi una pausa",
      });

      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('Pomodoro Completato! 🍅', {
          body: nextMateriaName || 'Tempo di pausa',
          icon: '/logo.png',
        });
      }
    } else {
      // Fine pausa
      setState(prev => ({
        ...prev,
        timeRemaining: prev.durataLavoro * 60,
        isPausa: false,
        isRunning: false, // Non auto-start lavoro
      }));

      toast({
        title: "⏰ Pausa Terminata!",
        description: "Torna al lavoro con focus!",
      });

      if (Notification.permission === 'granted') {
        new Notification('Pausa Terminata ⏰', {
          body: 'Torna al lavoro!',
          icon: '/logo.png',
        });
      }
    }
  };

  const startTimer = () => {
    setState(prev => ({ ...prev, isRunning: true }));
  };

  const pauseTimer = () => {
    setState(prev => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    // Stop audio on reset handled by effect when isRunning becomes false
    // But we might want to force audio stop or reset currentTime
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setState(prev => ({
      ...prev,
      timeRemaining: prev.durataLavoro * 60,
      isRunning: false,
      isPausa: false,
      isAudioPlaying: false
    }));
  };

  const toggleWidget = () => {
    setState(prev => ({
      ...prev,
      isWidgetMinimized: !prev.isWidgetMinimized
    }));
  };

  const expandWidget = () => {
    setState(prev => ({
      ...prev,
      isWidgetExpanded: !prev.isWidgetExpanded
    }));
  };

  const updateSettings = (settings: Partial<PomodoroState>) => {
    setState(prev => ({ ...prev, ...settings }));
    resetTimer();
  };

  const setInterleavingEnabled = (enabled: boolean) => {
    setState(prev => ({ ...prev, interleavingEnabled: enabled }));
  };

  const setSelectedMaterie = (materie: Array<{id: string; nome: string; icona: string}>) => {
    setState(prev => ({
      ...prev,
      selectedMaterie: materie,
      currentMateriaIndex: 0, // Reset a prima materia
    }));
  };

  const setBackgroundAudio = (audioId: string) => {
    setState(prev => ({ ...prev, backgroundAudio: audioId }));
  };

  const setAudioVolume = (volume: number) => {
    setState(prev => ({ ...prev, audioVolume: volume }));
  };

  const setCustomAudioFile = (file: File | null) => {
    setCustomAudioFileState(file);
    if (file) {
      setState(prev => ({ ...prev, backgroundAudio: 'custom' }));
    }
  };

  return (
    <PomodoroContext.Provider
      value={{
        ...state,
        startTimer,
        pauseTimer,
        resetTimer,
        toggleWidget,
        expandWidget,
        updateSettings,
        setInterleavingEnabled,
        setSelectedMaterie,
        setBackgroundAudio,
        setAudioVolume,
        setCustomAudioFile,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within PomodoroProvider');
  }
  return context;
}