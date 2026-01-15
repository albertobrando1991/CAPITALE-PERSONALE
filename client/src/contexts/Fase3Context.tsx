// ============================================================================
// FASE 3 CONTEXT
// File: client/src/contexts/Fase3Context.tsx
// Gestione stato globale Fase 3: Progress, Error Bins, SRS
// ============================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface Fase3Progress {
  id: number;
  user_id: number;
  concorso_id: number;
  total_errors: number;
  weak_areas_count: number;
  retention_rate: number;
  total_drill_hours: number;
  total_drill_sessions: number;
  total_srs_reviews: number;
  status: 'WEAK' | 'REVIEW' | 'SOLID';
  can_access_fase4: boolean;
  fase4_unlocked_at?: string;
  last_activity_at: string;
  active_weak_areas?: number;
  items_due_today?: number;
}

export interface ErrorBin {
  id: number;
  user_id: number;
  concorso_id: number;
  materia_id?: number;
  materia_name?: string;
  topic_name: string;
  topic_slug: string;
  error_count: number;
  error_rate: number;
  total_attempts: number;
  difficulty_score: number;
  recovery_plan?: string;
  recovery_plan_generated_at?: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  total_errors?: number;
}

export interface ErrorDetail {
  id: number;
  error_bin_id: number;
  source_type: 'quiz' | 'flashcard' | 'drill' | 'simulazione' | 'blind_retrieval';
  source_id?: number;
  question_text?: string;
  wrong_answer?: string;
  correct_answer?: string;
  explanation?: string;
  mistake_type?: 'memoria' | 'comprensione' | 'distrazione' | 'tempo' | 'confusione_concetti' | 'altro';
  is_recurring: boolean;
  recurrence_count: number;
  occurred_at: string;
}

export interface SRSItem {
  id: number;
  user_id: number;
  concorso_id: number;
  item_type: 'flashcard' | 'quiz_topic' | 'capitolo' | 'error_bin';
  item_id: number;
  item_reference?: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at?: string;
  last_rating?: number;
  total_reviews: number;
  times_forgotten: number;
  current_streak: number;
  best_streak: number;
  is_mastered: boolean;
  mastered_at?: string;
}

interface Fase3ContextValue {
  // State
  progress: Fase3Progress | null;
  errorBins: ErrorBin[];
  srsItemsDueToday: SRSItem[];
  loading: boolean;
  
  // Actions
  fetchProgress: (concorsoId: number | string) => Promise<void>;
  fetchErrorBins: (concorsoId: number | string, resolved?: boolean) => Promise<void>;
  fetchSRSItemsDueToday: (concorsoId: number | string) => Promise<void>;
  trackError: (concorsoId: number | string, errorData: Partial<ErrorDetail>) => Promise<void>;
  generateRecoveryPlan: (concorsoId: number | string, binId: number) => Promise<string>;
  resolveErrorBin: (concorsoId: number | string, binId: number) => Promise<void>;
  addToSRS: (concorsoId: number | string, itemType: string, itemId: number, itemReference?: string) => Promise<void>;
  reviewSRSItem: (concorsoId: number | string, itemId: number, rating: number) => Promise<any>;
  refreshAll: (concorsoId: number | string) => Promise<void>;
  forceSync: (concorsoId: number | string) => Promise<void>;
}

const Fase3Context = createContext<Fase3ContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function Fase3Provider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Fase3Progress | null>(null);
  const [errorBins, setErrorBins] = useState<ErrorBin[]>([]);
  const [srsItemsDueToday, setSrsItemsDueToday] = useState<SRSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // ============================================================================
  // FETCH PROGRESS
  // ============================================================================
  const fetchProgress = async (concorsoId: number | string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fase3/${concorsoId}/progress`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Errore fetch progress');

      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Errore fetchProgress:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare progresso Fase 3',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FETCH ERROR BINS
  // ============================================================================
  const fetchErrorBins = async (concorsoId: number | string, resolved?: boolean) => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = resolved !== undefined 
        ? `/api/fase3/${concorsoId}/error-bins?resolved=${resolved}&_t=${timestamp}` 
        : `/api/fase3/${concorsoId}/error-bins?_t=${timestamp}`;

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
      });

      if (!response.ok) throw new Error('Errore fetch error bins');

      const data = await response.json();
      setErrorBins(data);
    } catch (error) {
      console.error('Errore fetchErrorBins:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare analisi errori',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FETCH SRS ITEMS DUE TODAY
  // ============================================================================
  const fetchSRSItemsDueToday = async (concorsoId: number | string) => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/srs/due-today`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Errore fetch SRS items');

      const data = await response.json();
      setSrsItemsDueToday(data);
    } catch (error) {
      console.error('Errore fetchSRSItemsDueToday:', error);
    }
  };

  // ============================================================================
  // TRACK ERROR
  // ============================================================================
  const trackError = async (concorsoId: number | string, errorData: Partial<ErrorDetail>) => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(errorData)
      });

      if (!response.ok) throw new Error('Errore tracking error');

      // Refresh progress e error bins
      await fetchProgress(concorsoId);
      await fetchErrorBins(concorsoId);

      toast({
        title: 'Errore registrato',
        description: 'Aggiunto al tuo piano di consolidamento',
      });
    } catch (error) {
      console.error('Errore trackError:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile registrare errore',
        variant: 'destructive'
      });
    }
  };

  // ============================================================================
  // GENERATE RECOVERY PLAN
  // ============================================================================
  const generateRecoveryPlan = async (concorsoId: number | string, binId: number): Promise<string> => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/error-bins/${binId}/recovery-plan`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server Error Details:", errorData);
        throw new Error(errorData.error || 'Errore generazione recovery plan');
      }

      const data = await response.json();
      
      // Refresh error bins per aggiornare recovery_plan
      await fetchErrorBins(concorsoId);

      toast({
        title: 'Piano di Recupero generato',
        description: 'Strategia AI personalizzata pronta',
      });

      return data.recovery_plan;
    } catch (error) {
      console.error('Errore generateRecoveryPlan:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile generare piano recupero',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // ============================================================================
  // RESOLVE ERROR BIN
  // ============================================================================
  const resolveErrorBin = async (concorsoId: number | string, binId: number) => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/error-bins/${binId}/resolve`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Errore risoluzione bin');

      const data = await response.json(); // Get new state

      // Refresh
      await fetchProgress(concorsoId);
      await fetchErrorBins(concorsoId);

      toast({
        title: data.is_resolved ? 'Area consolidata! 🎉' : 'Area riaperta',
        description: data.is_resolved ? 'Argomento marcato come risolto' : 'Argomento riportato tra le aree attive',
      });
    } catch (error) {
      console.error('Errore resolveErrorBin:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato del bin',
        variant: 'destructive'
      });
    }
  };

  // ============================================================================
  // ADD TO SRS
  // ============================================================================
  const addToSRS = async (concorsoId: number | string, itemType: string, itemId: number, itemReference?: string) => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/srs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ item_type: itemType, item_id: itemId, item_reference: itemReference })
      });

      if (!response.ok) throw new Error('Errore aggiunta SRS');

      await fetchSRSItemsDueToday(concorsoId);

      toast({
        title: 'Aggiunto al Review Calendar 📅',
        description: `${itemReference || 'Item'} programmato per ripetizione spaziata`,
      });
    } catch (error) {
      console.error('Errore addToSRS:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiungere a Review Calendar',
        variant: 'destructive'
      });
    }
  };

  // ============================================================================
  // REVIEW SRS ITEM
  // ============================================================================
  const reviewSRSItem = async (concorsoId: number | string, itemId: number, rating: number) => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/srs/${itemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating })
      });

      if (!response.ok) throw new Error('Errore review SRS');

      const data = await response.json();

      // Refresh
      await fetchSRSItemsDueToday(concorsoId);
      await fetchProgress(concorsoId);

      const ratingLabels = ['Again', 'Hard', 'Good', 'Easy', 'Perfect'];
      toast({
        title: `Review completata: ${ratingLabels[rating - 1]}`,
        description: `Prossima review: ${new Date(data.next_review_date).toLocaleDateString('it-IT')}`,
      });

      return data;
    } catch (error) {
      console.error('Errore reviewSRSItem:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile registrare review',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // ============================================================================
  // REFRESH ALL
  // ============================================================================
  const refreshAll = async (concorsoId: number | string) => {
    await Promise.all([
      fetchProgress(concorsoId),
      fetchErrorBins(concorsoId),
      fetchSRSItemsDueToday(concorsoId)
    ]);
  };

  // ============================================================================
  // FORCE SYNC
  // ============================================================================
  const forceSync = async (concorsoId: number | string) => {
    try {
        setLoading(true);
        const response = await fetch(`/api/fase3/${concorsoId}/sync`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error("Sync failed");
        
        await refreshAll(concorsoId);
        
        toast({
            title: "Sincronizzazione completata",
            description: "I dati sono stati ricalcolati con successo."
        });
    } catch (e) {
        console.error("Sync error:", e);
    } finally {
        setLoading(false);
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value: Fase3ContextValue = {
    progress,
    errorBins,
    srsItemsDueToday,
    loading,
    fetchProgress,
    fetchErrorBins,
    fetchSRSItemsDueToday,
    trackError,
    generateRecoveryPlan,
    resolveErrorBin,
    addToSRS,
    reviewSRSItem,
    refreshAll,
    forceSync
  };

  return (
    <Fase3Context.Provider value={value}>
      {children}
    </Fase3Context.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useFase3() {
  const context = useContext(Fase3Context);
  if (!context) {
    throw new Error('useFase3 deve essere usato dentro Fase3Provider');
  }
  return context;
}
