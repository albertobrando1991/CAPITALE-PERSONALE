import { Flashcard } from "../Flashcard";

export default function FlashcardExample() {
  return (
    <Flashcard
      id="1"
      front="Chi nomina il Responsabile del Procedimento?"
      back="Il dirigente dell'unita organizzativa competente (art. 6, co. 1, L.241/90)."
      tags={["L.241/90", "Procedimento"]}
      difficulty="medium"
      source="Art. 6 L.241/90"
      onResponse={(id, response) => console.log("Response:", id, response)}
    />
  );
}
