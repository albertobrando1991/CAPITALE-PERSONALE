import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";

// todo: remove mock functionality
const mockSessions = [
  { id: "1", subject: "L.241/90", activity: "Flashcard", duration: 25, completed: true },
  { id: "2", subject: "TUPI", activity: "Quiz", duration: 25, completed: true },
  { id: "3", subject: "Costituzione", activity: "Lettura", duration: 25, completed: false },
];

export default function PomodoroPage() {
  const [subject, setSubject] = useState("L.241/90");
  const [activity, setActivity] = useState("flashcard");
  const [sessions, setSessions] = useState(mockSessions);

  const handleComplete = (type: "work" | "break") => {
    if (type === "work") {
      const newSession = {
        id: String(Date.now()),
        subject,
        activity: activity === "flashcard" ? "Flashcard" : activity === "quiz" ? "Quiz" : "Lettura",
        duration: 25,
        completed: true,
      };
      setSessions((prev) => [newSession, ...prev]);
      console.log("Session completed:", newSession);
    }
  };

  const completedToday = sessions.filter((s) => s.completed).length;
  const totalMinutes = completedToday * 25;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">Pomodoro Timer</h1>
          <p className="text-muted-foreground mt-1">
            Studia con la tecnica del pomodoro
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-center">
            <PomodoroTimer onComplete={handleComplete} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configura Sessione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Materia</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Es. L.241/90"
                    data-testid="input-subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity">Attivita</Label>
                  <Select value={activity} onValueChange={setActivity}>
                    <SelectTrigger data-testid="select-activity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flashcard">Flashcard</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="lettura">Lettura</SelectItem>
                      <SelectItem value="riassunto">Riassunto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Statistiche Oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{completedToday}</p>
                  <p className="text-sm text-muted-foreground">Sessioni</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{totalMinutes}</p>
                  <p className="text-sm text-muted-foreground">Minuti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessioni Recenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    data-testid={`session-${session.id}`}
                  >
                    {session.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.subject}</p>
                      <p className="text-xs text-muted-foreground">{session.activity}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {session.duration} min
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
