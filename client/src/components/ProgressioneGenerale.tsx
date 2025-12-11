import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lock, CheckCircle, Play, Pause } from "lucide-react";

interface FaseProgress {
  id: number;
  nome: string;
  descrizione: string;
  percentuale: number;
  stato: "completata" | "in_corso" | "pausa" | "bloccata";
}

interface ProgressioneGeneraleProps {
  livelloGlobale: number;
  giorniAlConcorso?: number;
  fasi: FaseProgress[];
}

const statoConfig = {
  completata: {
    icon: CheckCircle,
    badge: "Completata",
    badgeVariant: "default" as const,
    color: "text-green-600",
  },
  in_corso: {
    icon: Play,
    badge: "In Corso",
    badgeVariant: "default" as const,
    color: "text-blue-600",
  },
  pausa: {
    icon: Pause,
    badge: "In Pausa",
    badgeVariant: "secondary" as const,
    color: "text-yellow-600",
  },
  bloccata: {
    icon: Lock,
    badge: "Bloccata",
    badgeVariant: "outline" as const,
    color: "text-muted-foreground",
  },
};

export function ProgressioneGenerale({
  livelloGlobale,
  giorniAlConcorso,
  fasi,
}: ProgressioneGeneraleProps) {
  return (
    <Card data-testid="card-progressione-generale">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progressione Generale
          </CardTitle>
          {giorniAlConcorso !== undefined && (
            <Badge variant="outline" data-testid="badge-giorni-concorso">
              {giorniAlConcorso} giorni al concorso
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Livello Globale</span>
            <span className="font-semibold" data-testid="text-livello-globale">
              {livelloGlobale}%
            </span>
          </div>
          <Progress value={livelloGlobale} className="h-3" />
        </div>

        <div className="space-y-3 pt-2">
          {fasi.map((fase) => {
            const config = statoConfig[fase.stato];
            const Icon = config.icon;

            return (
              <div
                key={fase.id}
                className={`space-y-2 p-3 rounded-lg ${
                  fase.stato === "bloccata" ? "bg-muted/50 opacity-60" : "bg-muted"
                }`}
                data-testid={`fase-progress-${fase.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                    <span className="font-medium text-sm truncate">
                      Fase {fase.id === 0.5 ? "0.5" : fase.id}: {fase.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={config.badgeVariant}
                      className="text-xs"
                    >
                      {config.badge}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={fase.percentuale}
                    className="h-2 flex-1"
                  />
                  <span className="text-xs font-medium w-10 text-right">
                    {fase.percentuale}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const defaultFasiProgress: FaseProgress[] = [
  {
    id: 1,
    nome: "Intelligence & Setup",
    descrizione: "Decodifica bando + Requisiti + Calendario",
    percentuale: 0,
    stato: "in_corso",
  },
  {
    id: 0.5,
    nome: "Fondamenta AI-Enhanced",
    descrizione: "Flashcard + AI Tutor + Schema mentale",
    percentuale: 0,
    stato: "bloccata",
  },
  {
    id: 2,
    nome: "Acquisizione Strategica",
    descrizione: "SQ3R modificato + Lettura attiva",
    percentuale: 0,
    stato: "bloccata",
  },
  {
    id: 3,
    nome: "Consolidamento SRS",
    descrizione: "Active Recall + Mnemotecniche",
    percentuale: 0,
    stato: "bloccata",
  },
  {
    id: 4,
    nome: "Drill & Simulazione AI",
    descrizione: "Quiz infiniti + Hell Week",
    percentuale: 0,
    stato: "bloccata",
  },
];
