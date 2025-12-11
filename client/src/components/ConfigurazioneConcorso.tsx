import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, Clock, BookOpen, Database, AlertTriangle } from "lucide-react";
import type { BandoAnalysis } from "@shared/schema";

interface ConfigurazioneConcorsoProps {
  concorso?: {
    nome: string;
    categoria?: string;
    dataEsame?: Date | null;
    giorniDisponibili?: number;
    oreSettimanali?: number;
    bancaDatiDisponibile?: boolean;
    penalitaErrori?: number | null;
    bandoAnalysis?: BandoAnalysis | null;
  };
}

export function ConfigurazioneConcorso({ concorso }: ConfigurazioneConcorsoProps) {
  if (!concorso) {
    return (
      <Card className="border-dashed border-2" data-testid="card-config-empty">
        <CardContent className="p-6 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">Nessun Concorso Configurato</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Carica il bando del tuo concorso per iniziare
          </p>
        </CardContent>
      </Card>
    );
  }

  const materieCount = concorso.bandoAnalysis?.materie?.length || 0;

  return (
    <Card data-testid="card-config-concorso">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" />
          Configurazione Concorso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted-foreground">Concorso:</span>
            <span className="text-sm font-medium text-right flex-1" data-testid="text-concorso-nome">
              {concorso.nome}
            </span>
          </div>

          {concorso.categoria && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Badge variant="outline" data-testid="badge-categoria">
                {concorso.categoria}
              </Badge>
            </div>
          )}

          {concorso.dataEsame && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data Esame:
              </span>
              <span className="text-sm font-medium" data-testid="text-data-esame">
                {new Date(concorso.dataEsame).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          {concorso.giorniDisponibili && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Giorni Disponibili:</span>
              <Badge data-testid="badge-giorni">{concorso.giorniDisponibili}</Badge>
            </div>
          )}

          {concorso.oreSettimanali && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Ore Settimanali:
              </span>
              <span className="text-sm font-medium" data-testid="text-ore-settimanali">
                {concorso.oreSettimanali}h
              </span>
            </div>
          )}

          {materieCount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Materie Principali:
              </span>
              <Badge variant="secondary" data-testid="badge-materie">
                {materieCount}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              Banca Dati:
            </span>
            <Badge
              variant={concorso.bancaDatiDisponibile ? "default" : "secondary"}
              data-testid="badge-banca-dati"
            >
              {concorso.bancaDatiDisponibile ? "Disponibile" : "Non disponibile"}
            </Badge>
          </div>

          {concorso.penalitaErrori && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Penalita Errori:
              </span>
              <Badge variant="destructive" data-testid="badge-penalita">
                {concorso.penalitaErrori}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
