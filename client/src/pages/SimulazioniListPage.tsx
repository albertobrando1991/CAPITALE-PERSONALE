import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PenTool, Play, GraduationCap } from "lucide-react";
import { SimulazioniList } from "@/components/simulazioni/SimulazioniList";

export default function SimulazioniListPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/concorsi/:id/simulazioni");
  const concorsoId = params?.id;

  if (!concorsoId) {
    return (
      <div className="container mx-auto p-4">
        <p>Concorso non specificato</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/concorsi/${concorsoId}/fase3`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna alla Fase 3
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Simulazione Scritta */}
        <div
          className="group relative flex flex-col items-start gap-4 rounded-xl border p-6 hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => setLocation(`/concorsi/${concorsoId}/simulazione/setup`)}
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
          onClick={() => setLocation(`/concorsi/${concorsoId}/oral-exam`)}
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

      <SimulazioniList
        concorsoId={concorsoId}
        onNuovaSimulazione={() => setLocation(`/concorsi/${concorsoId}/simulazione/setup`)}
        showStartButton={false}
      />
    </div>
  );
}
