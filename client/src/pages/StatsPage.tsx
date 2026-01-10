import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { ProgressBar } from "@/components/ProgressBar";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

interface QuizHistoryItem {
  id: string;
  title: string;
  score: number;
  date: string;
  questions: number;
}

interface WeeklyTrendItem {
  day: string;
  hours: number;
}

interface StatsData {
  studyTime: number;
  flashcardsMastered: number;
  quizCompleted: number;
  averageAccuracy: number;
  quizHistory: QuizHistoryItem[];
  weeklyTrend: WeeklyTrendItem[];
}

export default function StatsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");

  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-status-online dark:text-status-online";
    if (score >= 60) return "text-secondary dark:text-secondary";
    return "text-destructive dark:text-destructive";
  };

  // Helper per formattare ore studio (da float a stringa)
  const formatStudyTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
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
          value={formatStudyTime(stats?.studyTime || 0)}
          icon={Clock}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Flashcard Masterate"
          value={stats?.flashcardsMastered || 0}
          icon={Layers}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Quiz Completati"
          value={stats?.quizCompleted || 0}
          icon={BookOpen}
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Precisione Media"
          value={`${stats?.averageAccuracy || 0}%`}
          icon={Target}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Andamento Studio (Settimanale)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.weeklyTrend.map((day, i) => (
                <ProgressBar 
                  key={i} 
                  value={Math.min(100, (day.hours / 4) * 100)} // Assumiamo 4h come target max giornaliero per la bar
                  label={`${day.day} - ${formatStudyTime(day.hours)}`} 
                />
              ))}
              {(!stats?.weeklyTrend || stats.weeklyTrend.length === 0) && (
                <p className="text-muted-foreground text-center py-4">Dati non disponibili</p>
              )}
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
               {/* Placeholder per aree miglioramento - in futuro calcolare da errori quiz */}
               <p className="text-sm text-muted-foreground">
                 Analisi dettagliata per materia disponibile dopo aver completato almeno 3 simulazioni.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cronologia Quiz (Ultimi 10)</CardTitle>
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
                {stats?.quizHistory.map((quiz) => (
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
                {(!stats?.quizHistory || stats.quizHistory.length === 0) && (
                   <tr>
                     <td colSpan={4} className="py-8 text-center text-muted-foreground">
                       Nessun quiz completato ancora
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
