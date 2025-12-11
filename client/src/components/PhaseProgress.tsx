import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle, Play, Circle } from "lucide-react";

interface Phase {
  id: number;
  title: string;
  description: string;
  levelRange: string;
  status: "locked" | "active" | "completed" | "available";
}

interface PhaseProgressProps {
  currentPhase: number;
  phases: Phase[];
  onPhaseClick?: (phaseId: number) => void;
}

const phaseColors = {
  locked: "bg-muted text-muted-foreground",
  available: "bg-secondary text-secondary-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const phaseIcons = {
  locked: Lock,
  available: Circle,
  active: Play,
  completed: CheckCircle,
};

export function PhaseProgress({ phases, onPhaseClick }: PhaseProgressProps) {
  return (
    <div className="space-y-3" data-testid="phase-progress">
      {phases.map((phase, index) => {
        const Icon = phaseIcons[phase.status];
        const isClickable = phase.status !== "locked";
        
        return (
          <div key={phase.id}>
            <button
              type="button"
              disabled={!isClickable}
              className="w-full text-left"
              onClick={() => isClickable && onPhaseClick?.(phase.id)}
              data-testid={`button-phase-${phase.id}`}
            >
              <Card
                className={`transition-all ${
                  phase.status === "active" ? "ring-2 ring-primary" : ""
                } ${isClickable ? "cursor-pointer hover-elevate" : "opacity-60"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${phaseColors[phase.status]}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">FASE {phase.id}</h3>
                        <Badge variant="outline" className="text-xs">
                          {phase.levelRange}
                        </Badge>
                        {phase.status === "active" && (
                          <Badge className="text-xs bg-primary">In corso</Badge>
                        )}
                        {phase.status === "completed" && (
                          <Badge className="text-xs bg-green-600">Completata</Badge>
                        )}
                      </div>
                      <p className="font-medium mt-1">{phase.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {phase.description}
                      </p>
                    </div>
                  </div>
                  {index < phases.length - 1 && (
                    <div className="ml-5 mt-3 border-l-2 border-dashed h-4 border-muted-foreground/30" />
                  )}
                </CardContent>
              </Card>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const defaultPhases: Phase[] = [
  {
    id: 1,
    title: "Intelligence & Setup",
    description: "Decodifica del bando e configurazione del motore di studio",
    levelRange: "0-10%",
    status: "active",
  },
  {
    id: 2,
    title: "Acquisizione Strategica",
    description: "Studio mirato delle materie con priorita basata sul peso",
    levelRange: "10-50%",
    status: "locked",
  },
  {
    id: 3,
    title: "Consolidamento e Memorizzazione",
    description: "Flashcard, ripetizione spaziata e quiz mirati",
    levelRange: "50-80%",
    status: "locked",
  },
  {
    id: 4,
    title: "Simulazione ad Alta Fedelta",
    description: "Simulazioni complete in condizioni d'esame reali",
    levelRange: "80-100%",
    status: "locked",
  },
];
