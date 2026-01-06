import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Flashcard } from "@shared/schema";

interface ProssimeRevisioniWidgetProps {
  concorsoId: string;
}

export function ProssimeRevisioniWidget({ concorsoId }: ProssimeRevisioniWidgetProps) {
  const { data: flashcards, isLoading } = useQuery<Flashcard[]>({
    queryKey: ['flashcards', concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/flashcards?concorsoId=${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch flashcards");
      return res.json();
    },
    enabled: !!concorsoId,
    refetchInterval: 30000, // Ricarica ogni 30 secondi per aggiornare i conteggi
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📅 Calendario Ripasso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }
  
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  // Conta solo le flashcard GIÀ STUDIATE (tentativiTotali > 0) con prossimoRipasso <= oggi
  // Le flashcard mai studiate (tentativiTotali === 0 o null) non vengono contate qui
  // perché non sono ancora state studiate e quindi non hanno bisogno di revisione
  const daRivedereOggi = flashcards?.filter(f => {
    // Solo flashcard già studiate almeno una volta
    const tentativiTotali = f.tentativiTotali || 0;
    if (tentativiTotali === 0) return false;
    if (!f.prossimoRipasso) return false;
    const dataRipasso = new Date(f.prossimoRipasso);
    dataRipasso.setHours(0, 0, 0, 0);
    return dataRipasso <= oggi;
  }).length || 0;
  
  const domani = new Date(oggi);
  domani.setDate(domani.getDate() + 1);
  
  // Conta solo le flashcard GIÀ STUDIATE con prossimoRipasso = domani
  const daRivedereDomani = flashcards?.filter(f => {
    // Solo flashcard già studiate almeno una volta
    const tentativiTotali = f.tentativiTotali || 0;
    if (tentativiTotali === 0) return false;
    if (!f.prossimoRipasso) return false;
    const dataRipasso = new Date(f.prossimoRipasso);
    dataRipasso.setHours(0, 0, 0, 0);
    return dataRipasso > oggi && dataRipasso <= domani;
  }).length || 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📅 Calendario Ripasso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="font-medium text-sm text-red-700 dark:text-red-300">Da rivedere oggi</span>
            <Badge variant="destructive">{daRivedereOggi}</Badge>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <span className="font-medium text-sm text-yellow-700 dark:text-yellow-300">Da rivedere domani</span>
            <Badge variant="secondary">{daRivedereDomani}</Badge>
          </div>
          {flashcards && flashcards.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {flashcards.filter(f => !f.tentativiTotali || f.tentativiTotali === 0).length} flashcard mai studiate non incluse
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
