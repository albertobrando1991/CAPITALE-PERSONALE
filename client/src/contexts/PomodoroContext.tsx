import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

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
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

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
      }
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
    };
  };

  const [state, setState] = useState<PomodoroState>(loadState);

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
    setState(prev => ({
      ...prev,
      timeRemaining: prev.durataLavoro * 60,
      isRunning: false,
      isPausa: false,
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