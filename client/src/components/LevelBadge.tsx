import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface LevelBadgeProps {
  level: number;
}

export function LevelBadge({ level }: LevelBadgeProps) {
  const getLevelTitle = (lvl: number) => {
    if (lvl < 10) return "Principiante";
    if (lvl < 25) return "Studente";
    if (lvl < 50) return "Esperto";
    if (lvl < 75) return "Maestro";
    return "Campione";
  };

  return (
    <Badge variant="secondary" className="gap-1" data-testid="level-badge">
      <Trophy className="h-3 w-3" />
      <span>Lv. {level}</span>
      <span className="text-muted-foreground">({getLevelTitle(level)})</span>
    </Badge>
  );
}
