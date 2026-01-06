import { useRoute } from "wouter";
import { SimulazioneRivedi } from "@/components/simulazioni/SimulazioneRivedi";

export default function SimulazioneRivediPage() {
  const [, params] = useRoute("/concorsi/:id/simulazione/:simId/rivedi");
  const simulazioneId = params?.simId;
  const concorsoId = params?.id;

  if (!simulazioneId) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <p>Simulazione non specificata</p>
      </div>
    );
  }

  return <SimulazioneRivedi simulazioneId={simulazioneId} concorsoId={concorsoId} />;
}
