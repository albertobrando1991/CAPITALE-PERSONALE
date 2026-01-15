// ============================================================================
// DRILL SESSION PAGE
// File: client/src/pages/concorsi/fase3/DrillSessionPage.tsx
// Coordinatore dell'intera drill session (setup → active → results)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DrillSessionSetup, { DrillConfig } from '@/components/fase3/DrillSessionSetup';
import DrillSessionActive, { DrillResults } from '@/components/fase3/DrillSessionActive';
import DrillSessionResults from '@/components/fase3/DrillSessionResults';
import { useFase3 } from '@/contexts/Fase3Context';

type DrillState = 'setup' | 'active' | 'results';

export default function DrillSessionPage() {
  const [, params] = useRoute("/concorsi/:concorsoId/fase3/drill");
  const concorsoId = params?.concorsoId;
  const [, setLocation] = useLocation();
  const { forceSync } = useFase3();
  const [drillState, setDrillState] = useState<DrillState>('setup');
  const [drillConfig, setDrillConfig] = useState<DrillConfig | null>(null);
  const [drillResults, setDrillResults] = useState<DrillResults | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Resume logic
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const resumeId = searchParams.get('resume');

    if (resumeId && drillState === 'setup') {
        fetchResumeSession(resumeId);
    }
  }, []);

  const fetchResumeSession = async (id: string) => {
      try {
          const res = await fetch(`/api/fase3/${concorsoId}/drill-sessions/${id}`);
          if (!res.ok) throw new Error("Sessione non trovata");
          const session = await res.json();
          
          if (session.is_completed) {
              alert("Questa sessione è già completata!");
              // Remove query param to clean URL
              setLocation(`/concorsi/${concorsoId}/fase3/drill`);
              return;
          }

          // Reconstruct config
          const config: DrillConfig = {
              mode: session.mode,
              topicId: session.topic_id,
              totalQuestions: session.total_questions,
              generatedQuestions: session.generated_questions // Pass saved questions
          };
          
          setDrillConfig(config);
          setSessionId(session.id);
          setDrillState('active');
      } catch (e) {
          console.error("Errore resume:", e);
          // alert("Impossibile riprendere la sessione.");
      }
  };

  const handleStart = async (config: DrillConfig) => {
    setDrillConfig(config);
    
    // API: Crea drill session nel DB
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/drill-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: config.mode,
          topic_id: config.topicId,
          total_questions: config.totalQuestions,
          generated_questions: config.generatedQuestions
        })
      });

      if (!response.ok) throw new Error('Errore creazione drill session');

      const data = await response.json();
      console.log('Drill session creata:', data);
      setSessionId(data.id);
      
      setDrillState('active');
    } catch (error) {
      console.error('Errore start drill:', error);
      alert('Impossibile avviare la drill session. Riprova.');
    }
  };

  const handleComplete = async (results: DrillResults) => {
    setDrillResults(results);

    // API: Completa drill session nel DB
    if (sessionId) {
      try {
        const response = await fetch(`/api/fase3/${concorsoId}/drill-sessions/${sessionId}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            correct_answers: results.correctAnswers,
            wrong_answers: results.wrongAnswers,
            skipped_questions: results.skippedQuestions,
            duration_seconds: results.durationSeconds,
            new_errors_found: results.newErrorsFound,
            questions_data: results.questionsData
          })
        });

        if (!response.ok) throw new Error('Errore completamento drill');
        
        // Sincronizza statistiche globali per aggiornare Error Binning
        if (concorsoId) {
            forceSync(concorsoId).catch(console.error);
        }

        console.log('Drill session completata');
      } catch (error) {
        console.error('Errore complete drill:', error);
      }
    }

    setDrillState('results');
  };

  const handleCancel = () => {
    if (confirm('Sei sicuro di voler annullare la sessione?')) {
      setDrillState('setup');
      setDrillConfig(null);
    }
  };

  const handleNewSession = () => {
    setDrillState('setup');
    setDrillConfig(null);
    setDrillResults(null);
    setSessionId(null);
  };

  const handleBackToDashboard = () => {
    setLocation(`/concorsi/${concorsoId}/fase3`);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Back Button (solo in setup e results) */}
      {(drillState === 'setup' || drillState === 'results') && (
        <Button
          variant="ghost"
          onClick={handleBackToDashboard}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna a Fase 3
        </Button>
      )}

      {/* State Rendering */}
      {drillState === 'setup' && (
        <DrillSessionSetup
          concorsoId={concorsoId || ''}
          onStart={handleStart}
        />
      )}

      {drillState === 'active' && drillConfig && sessionId && (
        <DrillSessionActive
          concorsoId={concorsoId || ''}
          sessionId={sessionId}
          config={drillConfig}
          initialQuestions={
            drillConfig.generatedQuestions 
              ? (typeof drillConfig.generatedQuestions === 'string' 
                  ? JSON.parse(drillConfig.generatedQuestions) 
                  : drillConfig.generatedQuestions)
              : undefined
          }
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}

      {drillState === 'results' && drillResults && (
        <DrillSessionResults
          results={drillResults}
          onNewSession={handleNewSession}
          onBackToDashboard={handleBackToDashboard}
        />
      )}
    </div>
  );
}
