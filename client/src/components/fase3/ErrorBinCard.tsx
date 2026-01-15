// ============================================================================
// ERROR BIN CARD COMPONENT
// File: client/src/components/fase3/ErrorBinCard.tsx
// Card singola per Error Bin con azioni
// ============================================================================

import React from 'react';
import { useFase3 } from '@/contexts/Fase3Context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import type { ErrorBin } from '@/contexts/Fase3Context';

interface ErrorBinCardProps {
  bin: ErrorBin;
  concorsoId: number;
  onOpenRecoveryPlan: (bin: ErrorBin) => void;
}

export default function ErrorBinCard({ bin, concorsoId, onOpenRecoveryPlan }: ErrorBinCardProps) {
  const { resolveErrorBin, addToSRS } = useFase3();

  const getSeverityColor = (rate: number) => {
    if (rate >= 50) return 'bg-red-500';
    if (rate >= 30) return 'bg-orange-500';
    if (rate >= 15) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleResolve = async () => {
    if (confirm(`Sei sicuro di voler marcare "${bin.topic_name}" come risolto?`)) {
      await resolveErrorBin(concorsoId, bin.id);
    }
  };

  const handleAddToSRS = async () => {
    await addToSRS(concorsoId, 'error_bin', bin.id, bin.topic_name);
  };

  return (
    <Card className={`${bin.is_resolved ? 'opacity-60 border-green-500' : 'border-2'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base mb-1">
              {bin.topic_name}
            </CardTitle>
            {bin.materia_name && (
              <Badge variant="outline" className="text-xs">
                {bin.materia_name}
              </Badge>
            )}
          </div>
          <Badge className={`${getSeverityColor(bin.error_rate)} text-white`}>
            {bin.error_rate.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metriche */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Errori</p>
            <p className="font-bold text-lg">{bin.error_count}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Tentativi</p>
            <p className="font-bold text-lg">{bin.total_attempts}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Difficoltà</p>
            <p className="font-bold text-lg">{bin.difficulty_score}/100</p>
          </div>
        </div>

        {/* Recovery Plan Indicator */}
        {bin.recovery_plan && !bin.is_resolved && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Recovery Plan generato</span>
          </div>
        )}

        {/* Resolved Indicator */}
        {bin.is_resolved && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">
              Risolto {bin.resolved_at ? new Date(bin.resolved_at).toLocaleDateString('it-IT') : ''}
            </span>
          </div>
        )}

        {/* Actions */}
        {!bin.is_resolved && (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => onOpenRecoveryPlan(bin)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {bin.recovery_plan ? 'Vedi Recovery Plan' : 'Genera Recovery Plan AI'}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddToSRS}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Aggiungi a SRS
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleResolve}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Marca Risolto
              </Button>
            </div>
          </div>
        )}

        {/* Date info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Creato: {new Date(bin.created_at).toLocaleDateString('it-IT')}
        </div>
      </CardContent>
    </Card>
  );
}
