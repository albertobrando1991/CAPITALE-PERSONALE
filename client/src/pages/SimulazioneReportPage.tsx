import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SimulazioneReport } from "@/components/simulazioni/SimulazioneReport";
import type { Simulazione } from "@shared/schema";

export default function SimulazioneReportPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/concorsi/:id/simulazione/:simId/report");
  const simulazioneId = params?.simId;
  const concorsoId = params?.id;

  const { data: simulazione, isLoading } = useQuery<Simulazione>({
    queryKey: ["/api/simulazioni", simulazioneId],
    queryFn: async () => {
      const res = await fetch(`/api/simulazioni/${simulazioneId}`);
      if (!res.ok) throw new Error("Failed to fetch simulazione");
      return res.json();
    },
    enabled: !!simulazioneId,
  });

  const handleRifaiSimulazione = () => {
    setLocation(`/concorsi/${concorsoId}/simulazione/setup`);
  };

  if (!simulazioneId) {
    return (
      <div className="container mx-auto p-4">
        <p>Simulazione non specificata</p>
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

  if (!simulazione) {
    return (
      <div className="container mx-auto p-4">
        <p>Simulazione non trovata</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Button
        variant="ghost"
        onClick={() => setLocation(`/concorsi/${concorsoId}/simulazioni`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Torna alle simulazioni
      </Button>
      <SimulazioneReport
        simulazione={simulazione}
        onRifaiSimulazione={handleRifaiSimulazione}
        concorsoId={concorsoId}
      />
    </div>
  );
}
