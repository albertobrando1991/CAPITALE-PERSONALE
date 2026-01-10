import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizResults } from "@/components/QuizResults";
import { ArrowLeft, HelpCircle, Play, X } from "lucide-react";
import { Link } from "wouter";

// todo: remove mock functionality
const mockQuizzes = [
  {
    id: "1",
    title: "L. 241/1990 - Procedimento Amministrativo",
    questionsCount: 10,
    difficulty: "Medio",
    lastScore: 80,
  },
  {
    id: "2",
    title: "D.Lgs. 165/2001 - TUPI",
    questionsCount: 15,
    difficulty: "Difficile",
    lastScore: null,
  },
  {
    id: "3",
    title: "Costituzione - Principi Fondamentali",
    questionsCount: 12,
    difficulty: "Facile",
    lastScore: 95,
  },
];

// todo: remove mock functionality
const mockQuestions = [
  {
    question: "Qual e il termine massimo per la conclusione del procedimento amministrativo secondo la L. 241/90?",
    options: ["15 giorni", "30 giorni", "60 giorni", "90 giorni"],
    correctAnswer: 1,
  },
  {
    question: "Chi nomina il Responsabile del Procedimento?",
    options: ["Il Sindaco", "Il Prefetto", "Il dirigente dell'unita organizzativa", "Il Consiglio Comunale"],
    correctAnswer: 2,
  },
  {
    question: "Cosa consente la SCIA?",
    options: [
      "Iniziare un'attivita dopo 30 giorni",
      "Iniziare un'attivita immediatamente",
      "Richiedere un permesso",
      "Sospendere un procedimento",
    ],
    correctAnswer: 1,
  },
];

export default function QuizPage() {
  const [quizzes] = useState(mockQuizzes);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<{ isCorrect: boolean; selectedIndex: number }[]>([]);
  const [startTime] = useState(Date.now());

  const handleStartQuiz = () => {
    setIsPlaying(true);
    setCurrentQuestion(0);
    setShowResults(false);
    setAnswers([]);
  };

  const handleAnswer = (isCorrect: boolean, selectedIndex: number) => {
    setAnswers((prev) => [...prev, { isCorrect, selectedIndex }]);
  };

  const handleNext = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleExit = () => {
    setIsPlaying(false);
    setShowResults(false);
  };

  if (showResults) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const wrongAnswers = answers
      .map((a, i) => ({
        question: mockQuestions[i].question,
        yourAnswer: mockQuestions[i].options[a.selectedIndex],
        correctAnswer: mockQuestions[i].options[mockQuestions[i].correctAnswer],
        isCorrect: a.isCorrect,
      }))
      .filter((a) => !a.isCorrect);

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <QuizResults
          totalQuestions={mockQuestions.length}
          correctAnswers={correctCount}
          timeSpent={timeSpent}
          wrongAnswers={wrongAnswers}
          onRetry={handleStartQuiz}
          onHome={handleExit}
        />
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            data-testid="button-exit-quiz"
          >
            <X className="h-4 w-4 mr-2" />
            Esci
          </Button>
          <span className="text-sm font-medium">Quiz in corso</span>
          <div className="w-20" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <QuizQuestion
            questionNumber={currentQuestion + 1}
            totalQuestions={mockQuestions.length}
            question={mockQuestions[currentQuestion].question}
            options={mockQuestions[currentQuestion].options}
            correctAnswer={mockQuestions[currentQuestion].correctAnswer}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">Quiz</h1>
          <p className="text-muted-foreground mt-1">
            Metti alla prova le tue conoscenze
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover-elevate" data-testid={`quiz-card-${quiz.id}`}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {quiz.questionsCount} domande - {quiz.difficulty}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {quiz.lastScore !== null && (
                <p className="text-sm text-muted-foreground mb-4">
                  Ultimo punteggio:{" "}
                  <span
                    className={`font-medium ${
                      quiz.lastScore >= 80
                        ? "text-status-online dark:text-status-online"
                        : quiz.lastScore >= 60
                        ? "text-secondary dark:text-secondary"
                        : "text-destructive dark:text-destructive"
                    }`}
                  >
                    {quiz.lastScore}%
                  </span>
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleStartQuiz}
                data-testid={`button-start-quiz-${quiz.id}`}
              >
                <Play className="h-4 w-4 mr-2" />
                Inizia Quiz
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
