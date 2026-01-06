import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Target, Play, History, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Concorso } from "@shared/schema";
import { SimulazioniList } from "@/components/simulazioni/SimulazioniList";

export default function SimulazioniPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [concorsoSelezionato, setConcorsoSelezionato] = useState<string>("");

  const { data: concorsi = [], isLoading: isLoadingConcorsi } = useQuery<Concorso[]>({
    queryKey: ["/api/concorsi"],
    queryFn: async () => {
      const res = await fetch("/api/concorsi");
      if (!res.ok) throw new Error("Failed to fetch concorsi");
      return res.json();
    },
  });

  const concorsiCompletati = concorsi.filter((c) => c.bandoAnalysis !== null);

  const handleNuovaSimulazione = () => {
    if (!concorsoSelezionato) {
      toast({
        title: "Seleziona un concorso",
        description: "Devi selezionare un concorso per creare una simulazione",
        variant: "destructive",
      });
      return;
    }

    const concorso = concorsi.find((c) => c.id === concorsoSelezionato);
    if (!concorso || !concorso.bandoAnalysis) {
      toast({
        title: "Completa la Fase 1",
        description: "Devi completare la Fase 1 per questo concorso prima di creare simulazioni",
        variant: "destructive",
      });
      return;
    }

    setLocation(`/concorsi/${concorsoSelezionato}/simulazione/setup`);
  };

  const handleVediStorico = () => {
    if (!concorsoSelezionato) {
      toast({
        title: "Seleziona un concorso",
        description: "Devi selezionare un concorso per vedere lo storico",
        variant: "destructive",
      });
      return;
    }

    setLocation(`/concorsi/${concorsoSelezionato}/simulazioni`);
  };

  if (isLoadingConcorsi) {
    return (
      <div className="container mx-auto p-6">
        <p>Caricamento concorsi...</p>
      </div>
    );
  }

  if (concorsi.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <Target className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Nessun concorso disponibile</h2>
            <p className="text-muted-foreground">
              Crea un concorso dalla Fase 1 per iniziare a fare simulazioni d'esame
            </p>
            <Button onClick={() => setLocation("/phase1")}>
              Vai alla Fase 1
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Simulazioni d'Esame</h1>
        <p className="text-muted-foreground">
          Crea e gestisci simulazioni d'esame per testare le tue conoscenze
        </p>
      </div>

      {/* Selettore Concorso */}
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Concorso</CardTitle>
          <CardDescription>
            Scegli il concorso per cui vuoi creare o visualizzare le simulazioni
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Concorso</label>
            <Select value={concorsoSelezionato} onValueChange={setConcorsoSelezionato}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un concorso" />
              </SelectTrigger>
              <SelectContent>
                {concorsi.map((concorso) => (
                  <SelectItem key={concorso.id} value={concorso.id}>
                    <div className="flex items-center gap-2">
                      <span>{concorso.nome || "Concorso senza nome"}</span>
                      {concorso.bandoAnalysis ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fase 1 completata
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Fase 1 da completare</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {concorsoSelezionato && (
            <div className="flex gap-3">
              <Button onClick={handleNuovaSimulazione} size="lg" className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Nuova Simulazione
              </Button>
              <Button onClick={handleVediStorico} variant="outline" size="lg" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Vedi Storico
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista Simulazioni se concorso selezionato */}
      {concorsoSelezionato && (
        <SimulazioniList
          concorsoId={concorsoSelezionato}
          onNuovaSimulazione={handleNuovaSimulazione}
        />
      )}
    </div>
  );
}
