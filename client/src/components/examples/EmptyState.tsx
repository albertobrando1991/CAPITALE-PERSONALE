import { EmptyState } from "../EmptyState";
import { BookOpen } from "lucide-react";

export default function EmptyStateExample() {
  return (
    <EmptyState
      icon={BookOpen}
      title="Nessun materiale"
      description="Carica il tuo primo materiale di studio per iniziare a generare flashcard e quiz."
      actionLabel="Carica Materiale"
      onAction={() => console.log("Upload clicked")}
    />
  );
}
