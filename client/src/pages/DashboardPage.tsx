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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Concorso } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [concorsoToDelete, setConcorsoToDelete] = useState<Concorso | null>(null);

  const { data: concorsi = [], isLoading: concorsiLoading } = useQuery<Concorso[]>({
    queryKey: ["/api/concorsi"],
    queryFn: async () => {
      const res = await fetch("/api/concorsi");
      if (!res.ok) throw new Error("Failed to fetch concorsi");
      return res.json();
    },
  });

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

  const handlePhaseClick = (phaseId: number, concorsoId?: string) => {
    if (!concorsoId && concorsi.length > 0) {
      concorsoId = concorsi[0].id;
    }
    if (phaseId === 1) {
      setLocation(concorsoId ? `/phase1?id=${concorsoId}` : "/phase1");
    } else if (phaseId === 2 && concorsoId) {
      setLocation(`/phase2?id=${concorsoId}`);
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
            Bentornato, {user?.name?.split(" ")[0] || "Studente"}!
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
            <Link href="/phase1">
              <Button data-testid="button-new-concorso">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Concorso
              </Button>
            </Link>
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
                      onClick={() => setLocation(isFase1Complete(concorso) ? `/phase2?id=${concorso.id}` : `/phase1?id=${concorso.id}`)}
                    >
                      {concorso.nome || "Concorso senza nome"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isFase1Complete(concorso) && (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fase 1
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
                  onClick={() => setLocation(isFase1Complete(concorso) ? `/phase2?id=${concorso.id}` : `/phase1?id=${concorso.id}`)}
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
                    {isFase1Complete(concorso) ? "Vai alla Fase 2" : "Completa Fase 1"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Sparkles className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Inizia dalla Fase 1: Intelligence & Setup</h3>
                <p className="text-muted-foreground mt-1">
                  Carica il bando del tuo primo concorso per far analizzare all'AI tutte 
                  le informazioni necessarie. Questo e il primo passo fondamentale per 
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
                <Link href="/phase1">
                  <Button className="mt-4" data-testid="button-start-phase1">
                    Carica il Bando
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
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
              <Link href="/phase1" className="block">
                <Button variant="secondary" className="w-full justify-start" data-testid="button-action-bando">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Carica Nuovo Bando
                </Button>
              </Link>
              <Link href={hasConcorsi && concorsi.some(c => c.bandoAnalysis) ? `/phase2?id=${concorsi.find(c => c.bandoAnalysis)?.id}` : "#"} className="block">
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
