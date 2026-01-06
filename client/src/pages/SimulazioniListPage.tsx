import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
        onClick={() => setLocation(`/phase2?id=${concorsoId}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna alla Fase 2
      </Button>
      <SimulazioniList
        concorsoId={concorsoId}
        onNuovaSimulazione={() => setLocation(`/concorsi/${concorsoId}/simulazione/setup`)}
      />
    </div>
  );
}
