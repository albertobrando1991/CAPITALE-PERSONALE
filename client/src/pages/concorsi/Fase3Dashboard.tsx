// ============================================================================
// FASE 3 DASHBOARD - Consolidamento & Pratica Intensa
// File: client/src/pages/concorsi/Fase3Dashboard.tsx
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useFase3 } from '@/contexts/Fase3Context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  Play,
  Lock,
  Unlock,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ErrorAnalytics from '@/components/fase3/ErrorAnalytics';

// ============================================================================
// COMPONENT
// ============================================================================

export default function Fase3Dashboard() {
  const [, params] = useRoute("/concorsi/:concorsoId/fase3");
  const concorsoId = params?.concorsoId;
  const [, setLocation] = useLocation();
  const { progress, errorBins, srsItemsDueToday, loading, refreshAll, forceSync } = useFase3();
  const [activeTab, setActiveTab] = useState('overview');
  const [drillSessions, setDrillSessions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Refresh stats when tab changes (to catch updates from other components)
    if (concorsoId) {
        refreshAll(concorsoId);
        if (activeTab === 'drill') {
            fetchDrillSessions();
        }
    }
  }, [concorsoId, activeTab]);

  const fetchDrillSessions = async () => {
    try {
      const response = await fetch(`/api/fase3/${concorsoId}/drill-sessions?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setDrillSessions(data);
      }
    } catch (error) {
      console.error("Error fetching drill sessions:", error);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione dalla cronologia?')) return;

    // Optimistic update: Rimuovi subito dalla lista locale per feedback istantaneo
    setDrillSessions(prev => prev.filter(s => s.id !== sessionId));

    try {
        const response = await fetch(`/api/fase3/${concorsoId}/drill-sessions/${sessionId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            toast({
                title: "Sessione eliminata",
                description: "La sessione è stata rimossa dalla cronologia.",
            });
            // Opzionale: fetchDrillSessions() non serve se l'optimistic update ha funzionato
            refreshAll(concorsoId!); // Refresh stats
        } else {
            throw new Error("Errore eliminazione");
        }
    } catch (error) {
        // Rollback in caso di errore
        toast({
            title: "Errore",
            description: "Impossibile eliminare la sessione.",
            variant: "destructive"
        });
        fetchDrillSessions(); // Ricarica la lista vera
    }
  };

  if (loading && !progress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento Fase 3...</p>
        </div>
      </div>
    );
  }

  // Determina colore badge status
  const statusConfig = {
    WEAK: { color: 'bg-red-500', label: 'Debole', icon: AlertCircle },
    REVIEW: { color: 'bg-yellow-500', label: 'In Revisione', icon: Clock },
    SOLID: { color: 'bg-green-500', label: 'Consolidato', icon: CheckCircle2 }
  };

  const currentStatus = statusConfig[progress?.status || 'WEAK'];

  // Calcola progresso verso SOLID
  const calculateProgressToSolid = () => {
    if (!progress) return 0;
    
    const weakAreasScore = Math.max(0, ((8 - (progress.active_weak_areas || 0)) / 8) * 100);
    const retentionScore = Number(progress.retention_rate || 0);
    const drillHoursScore = Math.min(100, (Number(progress.total_drill_hours || 0) / 20) * 100);
    
    return Math.round((weakAreasScore + retentionScore + drillHoursScore) / 3);
  };

  const progressToSolid = calculateProgressToSolid();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Fase 3: Consolidamento & Pratica
            </h1>
            <p className="text-muted-foreground text-lg">
              Trasforma la conoscenza in padronanza operativa
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => concorsoId && forceSync(concorsoId)}
                title="Ricalcola statistiche"
            >
                <RotateCcw className="h-4 w-4 mr-2" />
                Sync
            </Button>
            <Badge className={`${currentStatus.color} text-white px-4 py-2 text-lg`}>
              <currentStatus.icon className="mr-2 h-5 w-5" />
              {currentStatus.label}
            </Badge>
          </div>
        </div>

        {/* Progress Bar verso SOLID */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Progresso verso Consolidamento Completo</span>
              <span className="text-2xl font-bold">{progressToSolid}%</span>
            </div>
            <Progress value={progressToSolid} className="h-3 mb-3" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Aree Deboli</p>
                <p className="font-semibold">
                  {progress?.active_weak_areas || 0} / 3 max
                  {(progress?.active_weak_areas || 0) < 3 ? ' ✅' : ' ❌'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Retention Rate</p>
                <p className="font-semibold">
                  {Number(progress?.retention_rate || 0).toFixed(1)}% / 85% min
                  {(Number(progress?.retention_rate || 0)) >= 85 ? ' ✅' : ' ❌'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ore Drill</p>
                <p className="font-semibold">
                  {Number(progress?.total_drill_hours || 0).toFixed(1)}h / 20h min
                  {(Number(progress?.total_drill_hours || 0)) >= 20 ? ' ✅' : ' ❌'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unlock Simulazioni Alert */}
      {progress?.can_access_fase4 ? (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <Unlock className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Simulazioni Sbloccate! 🎉
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Hai completato la Fase 3. Sei pronto per le simulazioni d'esame reali.
            <Button
              variant="default"
              className="ml-4 bg-green-600 hover:bg-green-700"
              onClick={() => setLocation(`/concorsi/${concorsoId}/simulazioni`)}
            >
              Vai alle Simulazioni →
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <Lock className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">
            Simulazioni Bloccate
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            Completa i requisiti sopra per accedere alla Fase 4 (Simulazioni)
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Total Errors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errori Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{progress?.total_errors || 0}</span>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Da Quiz, Flashcards, Drill
            </p>
          </CardContent>
        </Card>

        {/* Weak Areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aree Deboli Attive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{progress?.active_weak_areas || 0}</span>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {errorBins.filter(b => !b.is_resolved).length} Error Bins aperti
            </p>
          </CardContent>
        </Card>

        {/* Drill Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessioni Drill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{progress?.total_drill_sessions || 0}</span>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Number(progress?.total_drill_hours || 0).toFixed(1)}h di pratica intensa
            </p>
          </CardContent>
        </Card>

        {/* SRS Reviews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Review Oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{srsItemsDueToday.length}</span>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progress?.total_srs_reviews || 0} review completate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Azioni Rapide
          </CardTitle>
          <CardDescription>
            Inizia subito un'attività di consolidamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              size="lg"
              variant="default"
              className="h-20"
              onClick={() => setActiveTab('binning')}
            >
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold">Analizza Errori</div>
                <div className="text-xs opacity-80">
                  {errorBins.filter(b => !b.is_resolved).length} aree da rivedere
                </div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="default"
              className="h-20"
              onClick={() => setLocation(`/concorsi/${concorsoId}/fase3/drill`)}
            >
              <div className="text-center">
                <Zap className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold">Inizia Drill Session</div>
                <div className="text-xs opacity-80">20 quiz mirati</div>
              </div>
            </Button>

            <Button
              size="lg"
              variant="default"
              className="h-20"
              onClick={() => setLocation(`/concorsi/${concorsoId}/fase3/review`)}
              disabled={srsItemsDueToday.length === 0}
            >
              <div className="text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1" />
                <div className="font-semibold">Review Oggi</div>
                <div className="text-xs opacity-80">
                  {srsItemsDueToday.length} item in scadenza
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Brain className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="binning">
            <BarChart3 className="mr-2 h-4 w-4" />
            Error Binning
          </TabsTrigger>
          <TabsTrigger value="drill">
            <Zap className="mr-2 h-4 w-4" />
            Drill Sessions
          </TabsTrigger>
          <TabsTrigger value="srs">
            <Calendar className="mr-2 h-4 w-4" />
            Review Calendar
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metodologia Fase 3</CardTitle>
              <CardDescription>
                Tre pilastri per il consolidamento efficace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border rounded-lg">
                  <BarChart3 className="h-10 w-10 text-red-500 mb-3" />
                  <h3 className="font-bold mb-2">1. Error Binning</h3>
                  <p className="text-sm text-muted-foreground">
                    Raggruppa errori per argomento. L'AI genera Recovery Plans personalizzati
                    per colmare le lacune sistematiche.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <Zap className="h-10 w-10 text-blue-500 mb-3" />
                  <h3 className="font-bold mb-2">2. Active Recall</h3>
                  <p className="text-sm text-muted-foreground">
                    Drill Sessions mirate sulle aree deboli. Pratica intensa senza skip,
                    feedback immediato, tracking miglioramento.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <Calendar className="h-10 w-10 text-purple-500 mb-3" />
                  <h3 className="font-bold mb-2">3. Spaced Repetition</h3>
                  <p className="text-sm text-muted-foreground">
                    Algoritmo SM-2 ottimizzato. Review programmate per massimizzare
                    retention a lungo termine.
                  </p>
                </div>
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Obiettivo Fase 3</AlertTitle>
                <AlertDescription>
                  Portare tutte le aree deboli a <strong>&lt; 3</strong>, retention rate a <strong>&gt; 85%</strong>,
                  completare <strong>20+ ore</strong> di pratica mirata. Le aree deboli sono collegate agli errori delle Drill Session.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Recent Activity Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Attività Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Completa drill sessions e review per vedere l'attività qui
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Binning Tab */}
        <TabsContent value="binning">
          <ErrorAnalytics concorsoId={concorsoId || ''} />
        </TabsContent>

        {/* Drill Sessions Tab */}
        <TabsContent value="drill">
          <Card>
            <CardHeader>
              <CardTitle>Drill Sessions History</CardTitle>
              <CardDescription>
                Storico delle tue sessioni di pratica mirata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setLocation(`/concorsi/${concorsoId}/fase3/drill`)}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Nuova Drill Session
                </Button>
                
                {drillSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna sessione ancora. Inizia la tua prima drill!
                  </p>
                ) : (
                  <div className="space-y-3 mt-4">
                    {drillSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${session.score_percentage >= 80 ? 'bg-green-100 text-green-700' : session.score_percentage >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {session.score_percentage >= 80 ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="font-semibold">
                                    {session.mode === 'topic' ? session.topic_id : (session.mode === 'weak' ? 'Aree Deboli' : 'Misto')}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(session.started_at).toLocaleDateString()} alle {new Date(session.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                             <div>
                                <div className="text-lg font-bold">
                                    {session.is_completed ? `${Number(session.score_percentage).toFixed(0)}%` : 'Incompleto'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {session.correct_answers}/{session.total_questions} corretti
                                </div>
                             </div>
                             
                             {!session.is_completed && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-primary border-primary hover:bg-primary hover:text-white"
                                    onClick={() => setLocation(`/concorsi/${concorsoId}/fase3/drill?resume=${session.id}`)}
                                >
                                    <Play className="h-3 w-3 mr-1" />
                                    Riprendi
                                </Button>
                             )}

                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteSession(session.id)}
                             >
                                <Trash2 className="h-4 w-4" />
                             </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SRS Review Tab (Placeholder) */}
        <TabsContent value="srs">
          <Card>
            <CardHeader>
              <CardTitle>Review Calendar</CardTitle>
              <CardDescription>
                Gestione ripetizione spaziata (SRS)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Review Oggi</p>
                    <p className="text-3xl font-bold">{srsItemsDueToday.length}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Review Totali</p>
                    <p className="text-3xl font-bold">{progress?.total_srs_reviews || 0}</p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setLocation(`/concorsi/${concorsoId}/fase3/review`)}
                  disabled={srsItemsDueToday.length === 0}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  {srsItemsDueToday.length > 0
                    ? `Inizia Review (${srsItemsDueToday.length} item)`
                    : 'Nessuna Review Oggi'
                  }
                </Button>

                {srsItemsDueToday.length === 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Nessun item da rivedere oggi. Torna domani o aggiungi nuovi item al calendario!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
