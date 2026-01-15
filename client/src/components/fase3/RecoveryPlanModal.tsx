// ============================================================================
// RECOVERY PLAN MODAL COMPONENT
// File: client/src/components/fase3/RecoveryPlanModal.tsx
// Modal per generare/visualizzare Recovery Plan AI
// ============================================================================

import React, { useState } from 'react';
import { useFase3 } from '@/contexts/Fase3Context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle2, Calendar, Target } from 'lucide-react';
import type { ErrorBin } from '@/contexts/Fase3Context';
import ReactMarkdown from 'react-markdown';

interface RecoveryPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bin: ErrorBin;
  concorsoId: number;
}

export default function RecoveryPlanModal({
  open,
  onOpenChange,
  bin,
  concorsoId
}: RecoveryPlanModalProps) {
  const { generateRecoveryPlan, addToSRS, resolveErrorBin } = useFase3();
  const [generating, setGenerating] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState(bin.recovery_plan || '');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const plan = await generateRecoveryPlan(concorsoId, bin.id);
      setRecoveryPlan(plan);
    } catch (error) {
      console.error('Errore generazione plan:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddToSRS = async () => {
    await addToSRS(concorsoId, 'error_bin', bin.id, bin.topic_name);
  };

  const handleResolve = async () => {
    await resolveErrorBin(concorsoId, bin.id);
    onOpenChange(false);
  };

  const getSeverityColor = (rate: number) => {
    if (rate >= 50) return 'bg-red-500';
    if (rate >= 30) return 'bg-orange-500';
    if (rate >= 15) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Recovery Plan AI
          </DialogTitle>
          <DialogDescription>
            Piano di recupero personalizzato per {bin.topic_name}
          </DialogDescription>
        </DialogHeader>

        {/* Bin Info */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Errori</p>
            <p className="text-2xl font-bold">{bin.error_count}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Tasso Errore</p>
            <Badge className={`${getSeverityColor(bin.error_rate)} text-white mt-1`}>
              {bin.error_rate.toFixed(1)}%
            </Badge>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Tentativi</p>
            <p className="text-2xl font-bold">{bin.total_attempts}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Difficoltà</p>
            <p className="text-2xl font-bold">{bin.difficulty_score}/100</p>
          </div>
        </div>

        {/* Materia Badge */}
        {bin.materia_name && (
          <Badge variant="outline" className="mb-4">
            {bin.materia_name}
          </Badge>
        )}

        {/* Recovery Plan Content */}
        {recoveryPlan ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                Piano Generato
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Generato da Gemini AI il{' '}
                {bin.recovery_plan_generated_at
                  ? new Date(bin.recovery_plan_generated_at).toLocaleString('it-IT')
                  : 'ora'}
              </AlertDescription>
            </Alert>

            {/* Markdown Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none p-6 border rounded-lg bg-accent/50">
              <ReactMarkdown>{recoveryPlan}</ReactMarkdown>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={handleAddToSRS}
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Aggiungi a Review Calendar
              </Button>

              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Rigenera Piano
              </Button>

              <Button
                variant="default"
                onClick={handleResolve}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marca Risolto
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Target className="h-5 w-5" />
              <AlertTitle>Nessun Piano Ancora</AlertTitle>
              <AlertDescription>
                L'AI analizzerà i tuoi errori e genererà un piano di recupero personalizzato
                con diagnosi, strategia e passi concreti.
              </AlertDescription>
            </Alert>

            <Button
              size="lg"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Genera Recovery Plan AI
                </>
              )}
            </Button>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>
            💡 <strong>Tip:</strong> Dopo aver seguito il piano, marca l'area come risolta
            quando il tasso di errore scende sotto il 10% e hai completato almeno 3 review corrette.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
