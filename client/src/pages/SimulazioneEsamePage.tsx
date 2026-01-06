import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SimulazioneEsame } from "@/components/simulazioni/SimulazioneEsame";
import type { Simulazione } from "@shared/schema";

export default function SimulazioneEsamePage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/concorsi/:id/simulazione/:simId");
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

  const handleComplete = (simulazioneCompletata: Simulazione) => {
    setLocation(`/concorsi/${concorsoId}/simulazione/${simulazioneId}/report`);
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

  if (simulazione.completata) {
    setLocation(`/concorsi/${concorsoId}/simulazione/${simulazioneId}/report`);
    return null;
  }

  return <SimulazioneEsame simulazione={simulazione} onComplete={handleComplete} />;
}
