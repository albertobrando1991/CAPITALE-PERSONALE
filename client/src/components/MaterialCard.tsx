import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Eye, Layers, HelpCircle } from "lucide-react";

interface MaterialCardProps {
  id: string;
  title: string;
  type: "normativa" | "giurisprudenza" | "manuale" | "documento" | "appunti";
  status: "pending" | "processing" | "completed";
  flashcardsCount: number;
  quizzesCount: number;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const typeLabels = {
  normativa: "Normativa",
  giurisprudenza: "Giurisprudenza",
  manuale: "Manuale",
  documento: "Documento",
  appunti: "Appunti Personali", // Added
};

const statusLabels = {
  pending: "In attesa",
  processing: "Elaborazione",
  completed: "Completato",
};

const statusColors = {
  pending: "secondary",
  processing: "default",
  completed: "default",
} as const;

export function MaterialCard({
  id,
  title,
  type,
  status,
  flashcardsCount,
  quizzesCount,
  onView,
  onDelete,
}: MaterialCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-material-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{title}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {typeLabels[type]}
              </Badge>
              <Badge variant={statusColors[status]} className="text-xs">
                {statusLabels[status]}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onView?.(id)}
            data-testid={`button-view-material-${id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizza
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              data-testid={`button-delete-material-${id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
