import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";

interface PomodoroTimerProps {
  workDuration?: number;
  breakDuration?: number;
  onComplete?: (type: "work" | "break") => void;
}

export function PomodoroTimer({
  workDuration = 25,
  breakDuration = 5,
  onComplete,
}: PomodoroTimerProps) {
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  const totalTime = isBreak ? breakDuration * 60 : workDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
  }, [isBreak, breakDuration, workDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const switchMode = () => {
    const newIsBreak = !isBreak;
    setIsBreak(newIsBreak);
    setTimeLeft(newIsBreak ? breakDuration * 60 : workDuration * 60);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!isBreak) {
            setSessions((s) => s + 1);
          }
          onComplete?.(isBreak ? "break" : "work");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isBreak, onComplete]);

  return (
    <Card className="w-full max-w-xs" data-testid="pomodoro-timer">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-4">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                isBreak
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isBreak ? "Pausa" : "Studio"}
            </span>
          </div>

          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                strokeLinecap="round"
                className={isBreak ? "text-green-500" : "text-primary"}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={reset}
              data-testid="button-reset-timer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={toggleTimer}
              data-testid="button-toggle-timer"
            >
              {isRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={switchMode}
              data-testid="button-switch-mode"
            >
              <Coffee className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Sessioni completate: <span className="font-semibold">{sessions}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
