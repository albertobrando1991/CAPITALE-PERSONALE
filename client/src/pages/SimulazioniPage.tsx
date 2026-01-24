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
import { Target, Play, History, CheckCircle, Brain, Clock, FileText, AlertTriangle, Lightbulb, GraduationCap, PenTool } from "lucide-react";
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
        <h1 className="text-3xl font-semibold mb-2">Fase 4: Simulazioni Esame</h1>
        <p className="text-muted-foreground">
          Crea e gestisci simulazioni d'esame per testare le tue conoscenze in condizioni reali.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Simulazione Scritta */}
              <div
                className="group relative flex flex-col items-start gap-4 rounded-xl border p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={handleNuovaSimulazione}
              >
                <div className="p-3 bg-secondary/10 rounded-lg group-hover:scale-110 transition-transform">
                  <PenTool className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Simulazione Scritta</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quiz a risposta multipla su materie specifiche. Timer e punteggio reale.
                  </p>
                </div>
                <Button className="w-full mt-auto" variant="secondary">
                  <Play className="h-4 w-4 mr-2" /> Inizia Quiz
                </Button>
              </div>

              {/* Simulazione Orale */}
              <div
                className="group relative flex flex-col items-start gap-4 rounded-xl border p-6 bg-gradient-to-br from-primary/5 to-transparent hover:from-primary/10 transition-all cursor-pointer border-primary/20"
                onClick={() => setLocation(`/concorsi/${concorsoSelezionato}/oral-exam`)}
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">Premium</Badge>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary">Simulazione Orale</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Interrogazione vocale con docente AI. Feedback su esposizione e contenuto.
                  </p>
                </div>
                <Button className="w-full mt-auto" variant="default">
                  <GraduationCap className="h-4 w-4 mr-2" /> Inizia Orale
                </Button>
              </div>
            </div>
          )}

          {concorsoSelezionato && (
            <div className="flex justify-end mt-4">
              <Button onClick={handleVediStorico} variant="ghost" size="sm" className="text-muted-foreground">
                <History className="h-4 w-4 mr-2" />
                Vedi Storico Simulazioni Scritte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specchietto Informativo: Strategia Anti-Ansia */}
      <Card className="bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <CardTitle className="text-primary">
              Strategia Anti-Ansia & Simulazione Realistica
            </CardTitle>
          </div>
          <CardDescription>
            L'ansia in sede d'esame distrugge la Memoria di Lavoro (il cortisolo inibisce l'ippocampo). L'unico modo per immunizzarsi è la simulazione realistica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2 p-3 bg-card rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <h3>No Comfort Zone</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Fai i quiz seduto a un tavolo, con rumore di fondo (usa app che simulano il brusio d'aula), senza cibo/musica.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-card rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-secondary">
                <Clock className="h-4 w-4" />
                <h3>Time Pressure</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Imposta il timer al 80% del tempo ufficiale. Se hai 60 minuti, allenati per finire in 45. Crea un "cuscinetto" per l'ansia.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-card rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                <h3>Foglio Risposte</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Se la prova è cartacea, usa fogli a lettura ottica fac-simile per allenare l'azione di annerimento.
              </p>
            </div>
          </div>

          <div className="border-t pt-4 border-primary/10">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-secondary" />
              6.2 Debriefing e Analisi dell'Errore
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Dopo la simulazione, il lavoro vero inizia. Analizza ogni errore:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1 border-destructive text-destructive">Tecnico</Badge>
                <div>
                  <span className="font-medium">Non sapevo la regola</span>
                  <p className="text-sm text-muted-foreground">→ Torna alla Fase di Studio (Review).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1 border-secondary text-secondary">Lettura</Badge>
                <div>
                  <span className="font-medium">Ho letto "non" dove non c'era, o "sempre" invece di "spesso"</span>
                  <p className="text-sm text-muted-foreground">→ Problema di attenzione. Rallenta nella fase di lettura della traccia (Fase Survey).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1 border-primary text-primary">Ragionamento</Badge>
                <div>
                  <span className="font-medium">Sapevo la regola ma l'ho applicata male</span>
                  <p className="text-sm text-muted-foreground">→ Problema di transfer. Cerca altri quiz simili per rinforzare il meccanismo logico.</p>
                </div>
              </div>
            </div>
          </div>
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
