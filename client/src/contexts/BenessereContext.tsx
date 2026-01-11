import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BenessereStats {
  breathing: {
    sessions_today: number;
    cycles_today: number;
  };
  hydration: {
    glasses_today: number;
    target_today: number;
    percentage: number;
  };
  sleep: {
    hours_last_night: number | null;
    quality_last_night: number | null;
  };
  reframing: {
    count_this_week: number;
  };
  nutrition: {
    meals_today: number;
    avg_energy: number | null;
  };
  achievements: {
    hydration_streak: number;
    total_breathing_sessions: number;
    sleep_streak: number;
    total_reframes: number;
  };
}

interface BenessereContextType {
  stats: BenessereStats | null;
  isWidgetMinimized: boolean;
  isWidgetVisible: boolean;
  toggleWidget: () => void;
  refreshStats: () => Promise<void>;
  addGlass: () => Promise<void>;
  startBreathing: () => void;
}

const BenessereContext = createContext<BenessereContextType | undefined>(undefined);

export function BenessereProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<BenessereStats | null>(null);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(true);
  const [isWidgetVisible, setIsWidgetVisible] = useState(true);

  // Fetch stats al mount e ogni 5 minuti
  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshStats = async () => {
    try {
      // Ottieni data locale YYYY-MM-DD per evitare problemi di fuso orario
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);

      const res = await fetch(`/api/benessere/dashboard?date=${localISOTime}&t=${Date.now()}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Errore fetch benessere stats:', error);
    }
  };

  const addGlass = async () => {
    try {
      const res = await fetch('/api/benessere/hydration/drink', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        await refreshStats();
      }
    } catch (error) {
      console.error('Errore add glass:', error);
    }
  };

  const toggleWidget = () => {
    setIsWidgetMinimized(!isWidgetMinimized);
  };

  const startBreathing = () => {
    // Questa funzione sarà implementata nel componente BoxBreathing
    window.location.href = '/benessere?tab=breathing';
  };

  return (
    <BenessereContext.Provider
      value={{
        stats,
        isWidgetMinimized,
        isWidgetVisible,
        toggleWidget,
        refreshStats,
        addGlass,
        startBreathing
      }}
    >
      {children}
    </BenessereContext.Provider>
  );
}

export function useBenessere() {
  const context = useContext(BenessereContext);
  if (context === undefined) {
    throw new Error('useBenessere must be used within BenessereProvider');
  }
  return context;
}