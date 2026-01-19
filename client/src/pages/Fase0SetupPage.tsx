import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BandoUpload } from "@/components/BandoUpload";
import { BandoAnalysis, type BandoData } from "@/components/BandoAnalysis";
import { PhaseProgress, defaultPhases } from "@/components/PhaseProgress";
import { ArrowLeft, Sparkles, BookOpen, Target, Calendar, Brain, Loader2, Save, FileText, ExternalLink, Wand2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Concorso, OfficialConcorso } from "@shared/schema";

export default function Fase0SetupPage({ params }: { params: { concorsoId: string } }) {
  const { concorsoId } = params;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bandoData, setBandoData] = useState<BandoData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  const { data: existingConcorso, isLoading: isLoadingConcorso } = useQuery<Concorso>({
    queryKey: ["/api/concorsi", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/concorsi/${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch concorso");
      return res.json();
    },
    enabled: !!concorsoId,
  });

  // Fetch official concorso data if this concorso was created from the catalog
  const { data: officialConcorso } = useQuery<OfficialConcorso>({
    queryKey: ["/api/official-concorsi", existingConcorso?.officialConcorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/official-concorsi`);
      if (!res.ok) throw new Error("Failed to fetch official concorsi");
      const list = await res.json();
      return list.find((c: OfficialConcorso) => c.id === existingConcorso?.officialConcorsoId);
    },
    enabled: !!existingConcorso?.officialConcorsoId,
  });

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (existingConcorso?.bandoAnalysis && !bandoData) {
      setBandoData(existingConcorso.bandoAnalysis as BandoData);
      lastSavedRef.current = JSON.stringify(existingConcorso.bandoAnalysis);
    }
  }, [existingConcorso, bandoData]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Concorso>) => {
      if (!concorsoId) return;
      return apiRequest("PATCH", `/api/concorsi/${concorsoId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/concorsi"] });
    },
  });

  const debouncedSave = useCallback((newBandoData: BandoData) => {
    if (!concorsoId) return;

    const currentDataStr = JSON.stringify(newBandoData);
    if (currentDataStr === lastSavedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveMutation.mutateAsync({
          bandoAnalysis: newBandoData,
          mesiPreparazione: newBandoData.mesiPreparazione,
          oreSettimanali: newBandoData.oreSettimanali,
        });
        lastSavedRef.current = currentDataStr;
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [concorsoId, saveMutation]);

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-bando", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Errore durante l'analisi");
      }

      const data = await response.json();
      setBandoData(data);

      toast({
        title: "Analisi completata",
        description: "Il bando è stato analizzato con successo.",
      });
    } catch (error) {
      console.error("Error analyzing bando:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'analisi del bando.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze pre-loaded PDF from catalog URL
  const handleAnalyzeFromUrl = async (pdfUrl: string) => {
    setIsAnalyzing(true);

    try {
      // Fetch the PDF from the URL
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error("Impossibile scaricare il PDF");
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File([pdfBlob], "bando.pdf", { type: "application/pdf" });

      // Use the same analyze endpoint
      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch("/api/analyze-bando", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Errore durante l'analisi");
      }

      const data = await response.json();
      setBandoData(data);

      toast({
        title: "Analisi completata",
        description: "Il bando dal catalogo è stato analizzato con successo.",
      });
    } catch (error) {
      console.error("Error analyzing bando from URL:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'analisi del bando.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateRequisito = (index: number, value: boolean) => {
    if (!bandoData) return;
    const newData = {
      ...bandoData,
      requisiti: bandoData.requisiti.map((r, i) =>
        i === index ? { ...r, soddisfatto: value } : r
      ),
    };
    setBandoData(newData);
    debouncedSave(newData);
  };

  const handleUpdatePassaggio = (index: number, value: boolean) => {
    if (!bandoData) return;
    const newData = {
      ...bandoData,
      passaggiIscrizione: bandoData.passaggiIscrizione.map((p, i) =>
        i === index ? { ...p, completato: value } : p
      ),
    };
    setBandoData(newData);
    debouncedSave(newData);
  };

  const handleUpdateCalendario = (mesi: number, ore: number) => {
    if (!bandoData) return;

    const oggi = bandoData.dataInizioStudio
      ? new Date(bandoData.dataInizioStudio)
      : new Date();
    const dataEsame = new Date(oggi);
    dataEsame.setMonth(dataEsame.getMonth() + mesi);

    const giorniTotali = Math.floor((dataEsame.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    const settimane = giorniTotali / 7;
    const oreTotali = Math.round(settimane * ore);

    const fasiConfig = [
      { nome: "Fase 0: Intelligence & Setup", percentuale: 10 },
      { nome: "Fase 1: Apprendimento Base (SQ3R)", percentuale: 40 },
      { nome: "Fase 2: Consolidamento e Memorizzazione", percentuale: 30 },
      { nome: "Fase 3: Simulazione ad Alta Fedeltà", percentuale: 20 }
    ];

    const giorniPerFase = fasiConfig.map(f => Math.floor(giorniTotali * (f.percentuale / 100)));
    const giorniAssegnati = giorniPerFase.reduce((a, b) => a + b, 0);
    const giorniRimanenti = giorniTotali - giorniAssegnati;
    giorniPerFase[giorniPerFase.length - 1] += giorniRimanenti;

    const orePerFase = fasiConfig.map(f => Math.floor(oreTotali * (f.percentuale / 100)));
    const oreAssegnate = orePerFase.reduce((a, b) => a + b, 0);
    const oreRimanenti = oreTotali - oreAssegnate;
    orePerFase[orePerFase.length - 1] += oreRimanenti;

    const formatDate = (d: Date) => {
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    let giorniUsati = 0;
    const nuovoCalendario = fasiConfig.map((fase, index) => {
      const giorniFase = giorniPerFase[index];
      const dataInizio = new Date(oggi);
      dataInizio.setDate(dataInizio.getDate() + giorniUsati);
      const dataFine = new Date(dataInizio);
      dataFine.setDate(dataFine.getDate() + giorniFase - 1);
      giorniUsati += giorniFase;

      return {
        fase: fase.nome,
        dataInizio: formatDate(dataInizio),
        dataFine: formatDate(dataFine),
        giorniDisponibili: giorniFase,
        oreStimate: orePerFase[index]
      };
    });

    const newData = {
      ...bandoData,
      mesiPreparazione: mesi,
      oreSettimanali: ore,
      oreTotaliDisponibili: oreTotali,
      calendarioInverso: nuovoCalendario
    };
    setBandoData(newData);
    debouncedSave(newData);
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

      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/concorsi"] });

      toast({
        title: "Fase 0 completata!",
        description: "Ora puoi accedere alla Fase 1: Apprendimento Base (SQ3R).",
      });

      setLocation(`/concorsi/${concorsoId}/fase1`);
    } catch (error) {
      console.error("Error completing phase 0:", error);
      toast({
        title: "Errore",
        description: "Errore nel completamento della fase 0.",
        variant: "destructive",
      });
    }
  };

  if (concorsoId && isLoadingConcorso) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento concorso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-phase1-title">
              FASE 0: Intelligence & Setup
            </h1>
            <p className="text-muted-foreground mt-1">
              {concorsoId && existingConcorso
                ? existingConcorso.nome
                : "Decodifica del bando e configurazione del motore di studio"}
            </p>
          </div>
        </div>
        {concorsoId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span data-testid="text-saving">Salvataggio...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span data-testid="text-saved">Salvato</span>
              </>
            )}
          </div>
        )}
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
                        All'università il programma è dato. Qui devi costruirlo tu
                        decodificando il bando. Non studiare nulla prima di aver
                        estratto tutti i dati necessari.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pre-loaded PDF from Official Catalog */}
              {officialConcorso?.bandoPdfUrl ? (
                <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">PDF Bando Pre-caricato</h3>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                            Dal Catalogo
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          Il bando per questo concorso è già stato caricato dallo staff.
                          Puoi avviare l'analisi AI direttamente o visualizzare il PDF.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={() => handleAnalyzeFromUrl(officialConcorso.bandoPdfUrl!)}
                            disabled={isAnalyzing}
                            className="gap-2"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analisi in corso...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Avvia Analisi AI
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            asChild
                            className="gap-2"
                          >
                            <a href={officialConcorso.bandoPdfUrl} target="_blank" rel="noreferrer">
                              <FileText className="h-4 w-4" />
                              Visualizza PDF
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <BandoUpload onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              )}

              {/* Show upload option even if there's a pre-loaded PDF - collapsed by default */}
              {officialConcorso?.bandoPdfUrl && (
                <details className="group">
                  <summary className="text-center text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Oppure carica un PDF diverso...
                  </summary>
                  <div className="mt-4">
                    <BandoUpload onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
                  </div>
                </details>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Cosa verrà estratto dall'AI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Requisiti Bloccanti</p>
                        <p className="text-sm text-muted-foreground">
                          Titoli di studio, età, cittadinanza
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Analisi Prove</p>
                        <p className="text-sm text-muted-foreground">
                          Preselettiva, banca dati, penalità
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
              onUpdateCalendario={handleUpdateCalendario}
              onConfirm={handleConfirm}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Le 5 Fasi del Protocollo</CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseProgress
                currentPhase={0}
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