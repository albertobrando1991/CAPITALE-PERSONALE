import { MaterialCard } from "../MaterialCard";

export default function MaterialCardExample() {
  return (
    <MaterialCard
      id="1"
      title="Legge 241/1990 - Procedimento Amministrativo"
      type="normativa"
      status="completed"
      flashcardsCount={45}
      quizzesCount={3}
      onView={(id) => console.log("View material:", id)}
      onDelete={(id) => console.log("Delete material:", id)}
    />
  );
}
