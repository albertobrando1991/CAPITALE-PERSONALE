import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { PhaseProgress, defaultPhases } from "@/components/PhaseProgress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Book,
  BookOpen,
  Layers,
  Flame,
  Trophy,
  ArrowRight,
  Clock,
  Target,
  Brain,
  Sparkles,
  Calendar,
  Battery,
  Plus,
  FileText,
  Trash2,
  CheckCircle,
  Library,
  Lightbulb,
  Wind,
  Droplets,
  Moon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBenessere } from "@/contexts/BenessereContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProssimeRevisioniWidget } from "@/components/ProssimeRevisioniWidget";
import type { Concorso, Simulazione } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats } = useBenessere();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [concorsoToDelete, setConcorsoToDelete] = useState<Concorso | null>(null);

  const { data: concorsi = [], isLoading: concorsiLoading } = useQuery<Concorso[]>({
    queryKey: ["/api/concorsi"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/concorsi");
      return res.json();
    },
  });

  // Carica tutte le simulazioni per calcolare statistiche
  const { data: tutteSimulazioni = [], isLoading: isLoadingSimulazioni } = useQuery<Simulazione[]>({
    queryKey: ["/api/simulazioni"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/simulazioni");
      return res.json();
    },
  });

  // Calcola statistiche simulazioni
  const simulazioniCompletate = tutteSimulazioni.filter((s) => s.completata);
  const migliorPunteggio = simulazioniCompletate.length > 0
    ? Math.max(...simulazioniCompletate.map((s) => s.punteggio || 0))
    : 0;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/concorsi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/concorsi"] });
      toast({
        title: "Concorso eliminato",
        description: "Il concorso e stato eliminato con successo.",
      });
      setDeleteDialogOpen(false);
      setConcorsoToDelete(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il concorso.",
        variant: "destructive",
      });
    },
  });

  const phases = defaultPhases;
  const hasConcorsi = !concorsiLoading && concorsi.length > 0;
  const livelloGlobale = 5;

  const handleCreateConcorso = async () => {
    try {
      const res = await apiRequest("POST", "/api/concorsi", {
        nome: "Nuovo Concorso",
        dataCreazione: new Date().toISOString(),
      });
      const newConcorso = await res.json();
      setLocation(`/concorsi/${newConcorso.id}/fase0`);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare un nuovo concorso.",
        variant: "destructive",
      });
    }
  };

  const handlePhaseClick = (phaseId: number, concorsoId?: string) => {
    if (!concorsoId && concorsi.length > 0) {
      concorsoId = concorsi[0].id;
    }
    if (!concorsoId) return;

    if (phaseId === 0) {
      setLocation(`/concorsi/${concorsoId}/fase0`);
    } else if (phaseId === 1) {
      setLocation(`/concorsi/${concorsoId}/fase1`);
    } else if (phaseId === 2) {
      setLocation(`/concorsi/${concorsoId}/fase2`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, concorso: Concorso) => {
    e.stopPropagation();
    setConcorsoToDelete(concorso);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (concorsoToDelete) {
      deleteMutation.mutate(concorsoToDelete.id);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Non specificata";
    return dateStr;
  };

  const isFase1Complete = (concorso: Concorso) => {
    return concorso.bandoAnalysis !== null;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-welcome">
            Benvenuto, {user?.name?.split(" ")[0] || "Studente"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Protocollo C.P.A. 2.0 - Preparazione Concorsi
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
            <Battery className="h-4 w-4 text-primary" />
            <span className="font-semibold" data-testid="text-livello">
              Livello: {livelloGlobale}%
            </span>
          </div>
        </div>
      </div>

      {concorsiLoading ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Caricamento concorsi...</p>
            </div>
          </CardContent>
        </Card>
      ) : hasConcorsi ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              I tuoi Concorsi ({concorsi.length})
            </h2>
            <Button onClick={handleCreateConcorso} data-testid="button-new-concorso">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Concorso
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concorsi.map((concorso) => (
              <Card 
                key={concorso.id} 
                className="hover-elevate cursor-pointer relative"
                data-testid={`card-concorso-${concorso.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle 
                      className="text-lg line-clamp-2 flex-1 cursor-pointer"
                      onClick={() => setLocation(isFase1Complete(concorso) ? `/concorsi/${concorso.id}/fase1` : `/concorsi/${concorso.id}/fase0`)}
                    >
                      {concorso.nome || "Concorso senza nome"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isFase1Complete(concorso) && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Setup OK
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {concorso.posti || "?"} posti
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, concorso)}
                        data-testid={`button-delete-concorso-${concorso.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent 
                  className="space-y-3"
                  onClick={() => setLocation(isFase1Complete(concorso) ? `/concorsi/${concorso.id}/fase1` : `/concorsi/${concorso.id}/fase0`)}
                >
                  {concorso.titoloEnte && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {concorso.titoloEnte}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {concorso.tipoConcorso && (
                      <Badge variant="outline" className="text-xs">
                        {concorso.tipoConcorso}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Scadenza:</span>
                    </div>
                    <span className="font-medium">{formatDate(concorso.scadenzaDomanda)}</span>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Preparazione:</span>
                    </div>
                    <span className="font-medium">{concorso.mesiPreparazione || 6} mesi</span>
                  </div>

                  <Button variant="secondary" className="w-full mt-2" size="sm">
                    {isFase1Complete(concorso) ? "Vai alla Fase 1 (SQ3R)" : "Completa Setup (Fase 0)"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/concorsi/${concorso.id}/setup-fonti`);
                    }} 
                    variant="outline" 
                    className="w-full mt-2"
                    size="sm"
                  >
                    <Library className="w-4 h-4 mr-2" />
                    Fonti & Materiali
                  </Button>

                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/concorsi/${concorso.id}/fase1`);
                    }} 
                    variant="outline" 
                    className="w-full mt-2"
                    size="sm"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Fase 1: Apprendimento Base (SQ3R)
                  </Button>
                  
                  {isFase1Complete(concorso) && (
                    <div className="mt-3">
                      <ProssimeRevisioniWidget concorsoId={concorso.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-secondary/50 bg-secondary/5 dark:bg-secondary/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Inizia dalla Fase 0: Intelligence & Setup</h3>
                <p className="text-muted-foreground mt-1">
                  Carica il bando del tuo primo concorso per far analizzare all'AI tutte 
                  le informazioni necessarie. Questo è il primo passo fondamentale per 
                  sbloccare tutte le altre fasi.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Verifica dei requisiti bloccanti
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Analisi automatica delle prove e tassonomia materie
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Generazione del calendario inverso personalizzato
                  </li>
                </ul>
                <Button className="mt-4" onClick={handleCreateConcorso} data-testid="button-start-phase1">
                  Carica il Bando
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Concorsi Attivi"
          value={concorsi.length}
          subtitle="In preparazione"
          icon={Target}
        />
        <StatsCard
          title="Progresso Globale"
          value={`${livelloGlobale}%`}
          subtitle="Completamento totale"
          icon={Layers}
        />
        <StatsCard
          title="Serie Attiva"
          value="0 giorni"
          subtitle="Inizia oggi!"
          icon={Flame}
        />
        <StatsCard
          title="Livello"
          value={user?.level || 0}
          icon={Trophy}
        />
      </div>

      {/* Widget Mindset */}
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            Ingegneria del Valore Umano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Il successo concorsuale dipende dalla <strong>variabile psicologica</strong> quanto da quella tecnica. 
            Scopri come trasformare il tuo mindset.
          </p>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setLocation('/libreria?tab=mindset')} 
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Esplora la Sezione Mindset
          </Button>
        </CardContent>
      </Card>

      {/* Sezione Simulazioni Esame */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Simulazioni Esame
            </CardTitle>
              <Button
                onClick={() => {
                  setLocation("/simulazioni");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Simulazione
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setLocation("/simulazioni")}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Simulazioni completate</p>
                  <p className="text-2xl font-bold">{simulazioniCompletate.length}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Miglior punteggio</p>
              <p className="text-2xl font-bold">
                {migliorPunteggio > 0 ? `${migliorPunteggio.toFixed(1)}%` : "N/A"}
              </p>
            </div>
          </div>
          {simulazioniCompletate.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Inizia la tua prima simulazione per testare le tue conoscenze!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Il Metodo delle 4 Fasi + Fondamenta AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseProgress
                phases={phases}
                onPhaseClick={handlePhaseClick}
              />
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Formula del Sistema:</span>{" "}
                  SUCCESSO = Intelligence + Fondamenta AI + Acquisizione + Consolidamento SRS + Drill AI + Simulazione
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full justify-start" 
                data-testid="button-action-bando"
                onClick={handleCreateConcorso}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Carica Nuovo Bando
              </Button>
              <Link href={hasConcorsi && concorsi.some(c => c.bandoAnalysis) ? `/concorsi/${concorsi.find(c => c.bandoAnalysis)?.id}/fase2` : "#"} className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasConcorsi || !concorsi.some(c => c.bandoAnalysis)}
                  data-testid="button-action-materiali"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gestisci Materiali (Fase 2)
                </Button>
              </Link>
              <Link href="/libreria" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasConcorsi}
                  data-testid="button-action-libreria"
                >
                  <Book className="h-4 w-4 mr-2" />
                  Libreria Pubblica
                </Button>
              </Link>
              <Link href="/flashcards" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasConcorsi}
                  data-testid="button-action-flashcards"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Ripassa Flashcard
                </Button>
              </Link>
              <Link href="/quiz" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasConcorsi}
                  data-testid="button-action-quiz"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Quiz AI
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Benessere Widget Card */}
          {stats && (
            <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-white dark:from-purple-950/20 dark:via-blue-950/20 dark:to-background border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="h-5 w-5 text-purple-600" />
                  Il Tuo Benessere Oggi
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Gestisci stress, sonno e mindset per massimizzare le performance
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {/* Hydration */}
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Droplets className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-600">
                      {stats.hydration.glasses_today}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      / {stats.hydration.target_today} 🥤
                    </p>
                  </div>

                  {/* Breathing */}
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Wind className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-purple-600">
                      {stats.breathing.sessions_today}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      sessioni
                    </p>
                  </div>

                  {/* Sleep */}
                  <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <Moon className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-indigo-600">
                      {stats.sleep.hours_last_night || '--'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ore sonno
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setLocation('/benessere')}
                  variant="outline"
                  className="w-full h-8 text-xs"
                >
                  Vai al Centro Benessere →
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Regole Auree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Non studiare senza piano</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Prima decodifica il bando, poi studia.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Fasi propedeutiche</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Ogni fase sblocca la successiva.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">7 giorni di tapering</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Scarico cognitivo prima dell'esame.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo concorso?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{concorsoToDelete?.nome || "questo concorso"}". 
              Questa azione e irreversibile e tutti i dati associati (materiali, flashcard, progressi) verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
