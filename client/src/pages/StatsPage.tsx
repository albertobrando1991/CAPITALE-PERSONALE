import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { ProgressBar } from "@/components/ProgressBar";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Clock,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";

// todo: remove mock functionality
const mockQuizHistory = [
  { id: "1", title: "L.241/90", score: 85, date: "Oggi", questions: 10 },
  { id: "2", title: "TUPI", score: 72, date: "Ieri", questions: 15 },
  { id: "3", title: "Costituzione", score: 95, date: "2 giorni fa", questions: 12 },
  { id: "4", title: "D.Lgs. 33/2013", score: 68, date: "3 giorni fa", questions: 10 },
];

export default function StatsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">Statistiche</h1>
            <p className="text-muted-foreground mt-1">
              Monitora i tuoi progressi
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(["week", "month", "year"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              data-testid={`button-period-${p}`}
            >
              {p === "week" ? "Settimana" : p === "month" ? "Mese" : "Anno"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tempo di Studio"
          value="12h 30m"
          icon={Clock}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Flashcard Ripassate"
          value={284}
          icon={Layers}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Quiz Completati"
          value={18}
          icon={BookOpen}
          trend={{ value: 20, isPositive: true }}
        />
        <StatsCard
          title="Precisione Media"
          value="78%"
          icon={Target}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Andamento Studio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProgressBar value={85} label="Lunedi - 2h 15m" />
              <ProgressBar value={65} label="Martedi - 1h 40m" />
              <ProgressBar value={90} label="Mercoledi - 2h 30m" />
              <ProgressBar value={45} label="Giovedi - 1h 10m" />
              <ProgressBar value={75} label="Venerdi - 2h" />
              <ProgressBar value={100} label="Sabato - 3h" />
              <ProgressBar value={30} label="Domenica - 45m" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Aree di Miglioramento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Termini Procedimento</span>
                  <span className="text-sm text-muted-foreground">62%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: "62%" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Silenzio Assenso</span>
                  <span className="text-sm text-muted-foreground">48%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: "48%" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Accesso Atti</span>
                  <span className="text-sm text-muted-foreground">85%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cronologia Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Quiz
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Punteggio
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Domande
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockQuizHistory.map((quiz) => (
                  <tr
                    key={quiz.id}
                    className="border-b last:border-0"
                    data-testid={`quiz-history-${quiz.id}`}
                  >
                    <td className="py-3 px-4 font-medium">{quiz.title}</td>
                    <td className={`py-3 px-4 font-semibold ${getScoreColor(quiz.score)}`}>
                      {quiz.score}%
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {quiz.questions}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{quiz.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
