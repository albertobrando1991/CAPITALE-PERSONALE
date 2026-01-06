import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, Eye, Calendar, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Simulazione } from "@shared/schema";
import { SimulazioneReport } from "./SimulazioneReport";

interface SimulazioniListProps {
  concorsoId: string;
  onNuovaSimulazione: () => void;
}

export function SimulazioniList({ concorsoId, onNuovaSimulazione }: SimulazioniListProps) {
  const { toast } = useToast();
  const [simulazioneVisualizzata, setSimulazioneVisualizzata] = useState<Simulazione | null>(null);
  const [simulazioneDaEliminare, setSimulazioneDaEliminare] = useState<string | null>(null);

  const { data: simulazioni, isLoading } = useQuery<Simulazione[]>({
    queryKey: ["/api/simulazioni", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/simulazioni?concorsoId=${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch simulazioni");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/simulazioni/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulazioni"] });
      toast({
        title: "Simulazione eliminata",
        description: "La simulazione è stata eliminata con successo",
      });
      setSimulazioneDaEliminare(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione della simulazione",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPunteggioColor = (punteggio: number | null | undefined) => {
    if (!punteggio) return "default";
    if (punteggio >= 70) return "default";
    if (punteggio >= 50) return "secondary";
    return "destructive";
  };

  if (simulazioneVisualizzata) {
    return (
      <div>
        <Button
          onClick={() => setSimulazioneVisualizzata(null)}
          variant="outline"
          className="mb-4"
        >
          ← Torna alla lista
        </Button>
        <SimulazioneReport
          simulazione={simulazioneVisualizzata}
          onRifaiSimulazione={() => {
            setSimulazioneVisualizzata(null);
            onNuovaSimulazione();
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Caricamento simulazioni...</p>
        </CardContent>
      </Card>
    );
  }

  if (!simulazioni || simulazioni.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">
            Nessuna simulazione ancora. Crea la tua prima simulazione!
          </p>
          <Button onClick={onNuovaSimulazione}>
            Crea Nuova Simulazione
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Storico Simulazioni</h2>
        <Button onClick={onNuovaSimulazione}>
          Nuova Simulazione
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {simulazioni.map((simulazione) => (
          <Card
            key={simulazione.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSimulazioneVisualizzata(simulazione)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  Simulazione #{simulazioni.length - simulazioni.indexOf(simulazione)}
                </CardTitle>
                <Badge variant={simulazione.completata ? "default" : "secondary"}>
                  {simulazione.completata ? "Completata" : "In corso"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(simulazione.dataInizio)}</span>
              </div>

              {simulazione.completata && simulazione.punteggio !== null && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <Badge variant={getPunteggioColor(simulazione.punteggio)}>
                      {simulazione.punteggio.toFixed(1)}%
                    </Badge>
                  </div>
                  {simulazione.tempoTrascorsoSecondi && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {Math.floor(simulazione.tempoTrascorsoSecondi / 60)}m{" "}
                        {simulazione.tempoTrascorsoSecondi % 60}s
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSimulazioneVisualizzata(simulazione);
                  }}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSimulazioneDaEliminare(simulazione.id);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog conferma eliminazione */}
      <AlertDialog
        open={!!simulazioneDaEliminare}
        onOpenChange={(open) => !open && setSimulazioneDaEliminare(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la simulazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa simulazione? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (simulazioneDaEliminare) {
                  deleteMutation.mutate(simulazioneDaEliminare);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
