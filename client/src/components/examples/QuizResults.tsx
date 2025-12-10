import { QuizResults } from "../QuizResults";

export default function QuizResultsExample() {
  return (
    <QuizResults
      totalQuestions={10}
      correctAnswers={7}
      timeSpent={245}
      wrongAnswers={[
        {
          question: "Qual e il termine massimo per la conclusione del procedimento?",
          yourAnswer: "60 giorni",
          correctAnswer: "30 giorni",
        },
        {
          question: "Chi nomina il Responsabile del Procedimento?",
          yourAnswer: "Il Sindaco",
          correctAnswer: "Il Dirigente",
        },
      ]}
      onRetry={() => console.log("Retry quiz")}
      onHome={() => console.log("Go home")}
    />
  );
}
