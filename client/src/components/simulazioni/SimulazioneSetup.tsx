import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Concorso, Simulazione } from "@shared/schema";

interface SimulazioneSetupProps {
  concorsoId: string;
  concorso: Concorso;
  onSimulazioneCreated: (simulazione: Simulazione) => void;
}

export function SimulazioneSetup({ concorsoId, concorso, onSimulazioneCreated }: SimulazioneSetupProps) {
  const { toast } = useToast();
  const [numeroDomande, setNumeroDomande] = useState<number>(40);
  const [durataMinuti, setDurataMinuti] = useState<number>(60);
  const [tipoSimulazione, setTipoSimulazione] = useState<"completa" | "materia" | "allenamento">("completa");
  const [materieSelezionate, setMaterieSelezionate] = useState<string[]>([]);

  // Estrai materie dal bandoAnalysis
  const bandoAnalysis = concorso.bandoAnalysis as any;
  const materieDisponibili = bandoAnalysis?.materie?.map((m: any) => m.nome) || [];

  const createSimulazioneMutation = useMutation({
    mutationFn: async (data: {
      concorsoId: string;
      numeroDomande: number;
      durataMinuti: number;
      tipoSimulazione: string;
      materieFiltrate: string[];
    }) => {
      try {
        const res = await apiRequest("POST", "/api/simulazioni", data);
        const json = await res.json();
        return json;
      } catch (error: any) {
        console.error("Errore nella creazione simulazione:", error);
        throw error;
      }
    },
    onSuccess: (simulazione: Simulazione) => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulazioni"] });
      toast({
        title: "Simulazione creata",
        description: "La simulazione è pronta. Buona fortuna!",
      });
      onSimulazioneCreated(simulazione);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione della simulazione",
        variant: "destructive",
      });
    },
  });

  const handleToggleMateria = (materia: string) => {
    setMaterieSelezionate((prev) =>
      prev.includes(materia)
        ? prev.filter((m) => m !== materia)
        : [...prev, materia]
    );
  };

  const handleInizia = () => {
    if (tipoSimulazione === "materia" && materieSelezionate.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona almeno una materia per questo tipo di simulazione",
        variant: "destructive",
      });
      return;
    }

    createSimulazioneMutation.mutate({
      concorsoId,
      numeroDomande,
      durataMinuti,
      tipoSimulazione,
      materieFiltrate: tipoSimulazione === "materia" ? materieSelezionate : [],
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configura Simulazione d'Esame</CardTitle>
        <CardDescription>
          Scegli le impostazioni per la tua simulazione d'esame
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Numero Domande */}
        <div className="space-y-2">
          <Label htmlFor="numero-domande">Numero Domande</Label>
          <Select
            value={numeroDomande.toString()}
            onValueChange={(value) => setNumeroDomande(parseInt(value))}
          >
            <SelectTrigger id="numero-domande">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 domande</SelectItem>
              <SelectItem value="40">40 domande</SelectItem>
              <SelectItem value="60">60 domande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Durata */}
        <div className="space-y-2">
          <Label htmlFor="durata">Durata (minuti)</Label>
          <Select
            value={durataMinuti.toString()}
            onValueChange={(value) => setDurataMinuti(parseInt(value))}
          >
            <SelectTrigger id="durata">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minuti</SelectItem>
              <SelectItem value="60">60 minuti</SelectItem>
              <SelectItem value="90">90 minuti</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tipo Simulazione */}
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo Simulazione</Label>
          <Select
            value={tipoSimulazione}
            onValueChange={(value) => {
              setTipoSimulazione(value as "completa" | "materia" | "allenamento");
              if (value !== "materia") {
                setMaterieSelezionate([]);
              }
            }}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Completa (tutte le materie)</SelectItem>
              <SelectItem value="materia">Per Materia</SelectItem>
              <SelectItem value="allenamento">Allenamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Materie (solo se tipoSimulazione === "materia") */}
        {tipoSimulazione === "materia" && materieDisponibili.length > 0 && (
          <div className="space-y-2">
            <Label>Seleziona Materie</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
              {materieDisponibili.map((materia: string) => (
                <div key={materia} className="flex items-center space-x-2">
                  <Checkbox
                    id={`materia-${materia}`}
                    checked={materieSelezionate.includes(materia)}
                    onCheckedChange={() => handleToggleMateria(materia)}
                  />
                  <Label
                    htmlFor={`materia-${materia}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {materia}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pulsante Inizia */}
        <Button
          onClick={handleInizia}
          disabled={createSimulazioneMutation.isPending}
          className="w-full"
          size="lg"
        >
          {createSimulazioneMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creazione in corso...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Inizia Simulazione
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
