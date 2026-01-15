// ============================================================================
// ERROR ANALYTICS COMPONENT
// File: client/src/components/fase3/ErrorAnalytics.tsx
// ============================================================================

import React, { useState } from 'react';
import { useFase3, ErrorBin } from '@/contexts/Fase3Context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle2, Brain, ChevronRight, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  concorsoId: number;
}

export default function ErrorAnalytics({ concorsoId }: Props) {
  const { errorBins, generateRecoveryPlan, resolveErrorBin } = useFase3();
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const handleGeneratePlan = async (binId: number) => {
    setGeneratingId(binId);
    try {
      await generateRecoveryPlan(concorsoId, binId);
    } finally {
      setGeneratingId(null);
    }
  };

  const activeBins = errorBins.filter(b => !b.is_resolved);
  const resolvedBins = errorBins.filter(b => b.is_resolved);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aree Deboli Attive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBins.length}</div>
            <p className="text-sm text-muted-foreground">Richiedono attenzione immediata</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aree Risolte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolvedBins.length}</div>
            <p className="text-sm text-muted-foreground">Consolidate con successo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analisi Aree Deboli</CardTitle>
        </CardHeader>
        <CardContent>
          {errorBins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>Ottimo lavoro! Nessuna area debole attiva al momento.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {errorBins.map((bin) => (
                <AccordionItem key={bin.id} value={`bin-${bin.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 text-left">
                        {bin.is_resolved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        <div>
                          <div className={`font-semibold ${bin.is_resolved ? 'text-muted-foreground line-through' : ''}`}>
                            {bin.topic_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bin.materia_name || 'Materia non spec.'} • {bin.total_errors} errori
                          </div>
                        </div>
                      </div>
                      <Badge variant={bin.is_resolved ? "outline" : (bin.error_rate > 50 ? "destructive" : "secondary")}>
                        {bin.is_resolved ? 'RISOLTO' : `${Number(bin.error_rate).toFixed(0)}% Err`}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 px-4 bg-muted/30 rounded-b-lg">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold mb-1">Dettagli Errore</h4>
                          <p className="text-sm text-muted-foreground">
                            Hai sbagliato questo argomento {bin.total_errors} volte su {bin.total_attempts} tentativi.
                          </p>
                        </div>
                        
                        {bin.is_resolved ? (
                             <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveErrorBin(concorsoId, bin.id)} // Qui idealmente dovrebbe essere un'azione di "Reopen" o simile, ma per ora usiamo resolve come toggle se supportato, o aggiungiamo logica specifica
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Riapri Area
                            </Button>
                        ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveErrorBin(concorsoId, bin.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Marca come Risolto
                            </Button>
                        )}
                      </div>

                      {bin.recovery_plan ? (
                        <div className="bg-white dark:bg-slate-950 p-4 rounded-lg border shadow-sm">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                            <Brain className="h-5 w-5 text-purple-500" />
                            <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                              AI Recovery Plan
                            </h4>
                            <span className="text-xs text-muted-foreground ml-auto">
                              Generato il {new Date(bin.recovery_plan_generated_at!).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{bin.recovery_plan}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        !bin.is_resolved && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900 flex flex-col items-center text-center">
                              <Brain className="h-8 w-8 text-blue-500 mb-2" />
                              <h4 className="font-semibold mb-1">Genera Piano di Recupero</h4>
                              <p className="text-sm text-muted-foreground mb-3 max-w-md">
                                L'AI analizzerà i tuoi errori specifici per creare una strategia di studio personalizzata.
                              </p>
                              <Button 
                                onClick={() => handleGeneratePlan(bin.id)} 
                                disabled={generatingId === bin.id}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {generatingId === bin.id ? (
                                  <>Generating...</>
                                ) : (
                                  <>
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Genera con AI
                                  </>
                                )}
                              </Button>
                            </div>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
