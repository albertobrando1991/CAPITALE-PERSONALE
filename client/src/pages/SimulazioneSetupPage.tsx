import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SimulazioneSetup } from "@/components/simulazioni/SimulazioneSetup";
import type { Concorso, Simulazione } from "@shared/schema";

export default function SimulazioneSetupPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/concorsi/:id/simulazione/setup");
  const concorsoId = params?.id;

  const { data: concorso, isLoading } = useQuery<Concorso>({
    queryKey: ["/api/concorsi", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/concorsi/${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch concorso");
      return res.json();
    },
    enabled: !!concorsoId,
  });

  const handleSimulazioneCreated = (simulazione: Simulazione) => {
    setLocation(`/concorsi/${concorsoId}/simulazione/${simulazione.id}`);
  };

  if (!concorsoId) {
    return (
      <div className="container mx-auto p-4">
        <p>Concorso non specificato</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!concorso) {
    return (
      <div className="container mx-auto p-4">
        <p>Concorso non trovato</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/concorsi/${concorsoId}/fase3`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna alla Fase 3
      </Button>
      <SimulazioneSetup
        concorsoId={concorsoId}
        concorso={concorso}
        onSimulazioneCreated={handleSimulazioneCreated}
      />
    </div>
  );
}
