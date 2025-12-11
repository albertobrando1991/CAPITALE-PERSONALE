import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandoUpload } from "@/components/BandoUpload";
import { BandoAnalysis, type BandoData } from "@/components/BandoAnalysis";
import { PhaseProgress, defaultPhases } from "@/components/PhaseProgress";
import { ArrowLeft, Sparkles, BookOpen, Target, Calendar, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Phase1Page() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bandoData, setBandoData] = useState<BandoData | null>(null);

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/analyze-bando", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Errore durante l'analisi");
      }
      
      const data = await response.json();
      setBandoData(data);
      
      toast({
        title: "Analisi completata",
        description: "Il bando e stato analizzato con successo.",
      });
    } catch (error) {
      console.error("Error analyzing bando:", error);
      toast({
        title: "Errore",
        description: "Si e verificato un errore durante l'analisi del bando.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateRequisito = (index: number, value: boolean) => {
    if (!bandoData) return;
    setBandoData({
      ...bandoData,
      requisiti: bandoData.requisiti.map((r, i) =>
        i === index ? { ...r, soddisfatto: value } : r
      ),
    });
  };

  const handleUpdatePassaggio = (index: number, value: boolean) => {
    if (!bandoData) return;
    setBandoData({
      ...bandoData,
      passaggiIscrizione: bandoData.passaggiIscrizione.map((p, i) =>
        i === index ? { ...p, completato: value } : p
      ),
    });
  };

  const handleConfirm = async () => {
    try {
      const response = await fetch("/api/phase1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bandoData),
      });
      
      if (!response.ok) {
        throw new Error("Errore nel completamento");
      }
      
      toast({
        title: "Fase 1 completata!",
        description: "Ora puoi accedere alla Fase 2: Acquisizione Strategica.",
      });
    } catch (error) {
      console.error("Error completing phase 1:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">FASE 1: Intelligence & Setup</h1>
          <p className="text-muted-foreground mt-1">
            Decodifica del bando e configurazione del motore di studio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!bandoData ? (
            <>
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Differenza col metodo universitario
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        All'universita il programma e dato. Qui devi costruirlo tu 
                        decodificando il bando. Non studiare nulla prima di aver 
                        estratto tutti i dati necessari.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <BandoUpload onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

              <Card>
                <CardHeader>
                  <CardTitle>Cosa verra estratto dall'AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Requisiti Bloccanti</p>
                        <p className="text-sm text-muted-foreground">
                          Titoli di studio, eta, cittadinanza
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Analisi Prove</p>
                        <p className="text-sm text-muted-foreground">
                          Preselettiva, banca dati, penalita
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Tassonomia Materie</p>
                        <p className="text-sm text-muted-foreground">
                          Materie esplode in micro-argomenti
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Calendario Inverso</p>
                        <p className="text-sm text-muted-foreground">
                          Piano temporale con tapering
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <BandoAnalysis
              data={bandoData}
              onUpdateRequisito={handleUpdateRequisito}
              onUpdatePassaggio={handleUpdatePassaggio}
              onConfirm={handleConfirm}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Le 4 Fasi del Protocollo</CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseProgress
                currentPhase={1}
                phases={defaultPhases}
                onPhaseClick={(id) => console.log("Phase clicked:", id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
