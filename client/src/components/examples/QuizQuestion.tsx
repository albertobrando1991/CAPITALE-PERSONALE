import { QuizQuestion } from "../QuizQuestion";

export default function QuizQuestionExample() {
  return (
    <QuizQuestion
      questionNumber={3}
      totalQuestions={10}
      question="Qual e il termine massimo per la conclusione del procedimento amministrativo secondo la L. 241/90?"
      options={[
        "15 giorni",
        "30 giorni",
        "60 giorni",
        "90 giorni",
      ]}
      correctAnswer={1}
      onAnswer={(isCorrect, idx) => console.log("Answer:", isCorrect, idx)}
      onNext={() => console.log("Next question")}
    />
  );
}
