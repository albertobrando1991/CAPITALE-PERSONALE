import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  BookOpen,
  FileCheck,
  Clock,
  ArrowRight,
  Target,
  ListChecks,
} from "lucide-react";

export interface BandoData {
  titoloEnte: string;
  tipoConcorso: string;
  scadenzaDomanda: string;
  dataPresuntaEsame: string;
  posti: number;
  requisiti: {
    titolo: string;
    soddisfatto: boolean | null;
  }[];
  prove: {
    tipo: string;
    descrizione: string;
    hasPreselettiva: boolean;
    hasBancaDati: boolean;
    penalitaErrori: string | null;
  };
  materie: {
    nome: string;
    microArgomenti: string[];
    peso: number;
  }[];
  passaggiIscrizione: {
    step: number;
    descrizione: string;
    completato: boolean;
  }[];
  calendarioInverso: {
    fase: string;
    dataInizio: string;
    dataFine: string;
    giorniDisponibili: number;
    oreStimate: number;
  }[];
  oreTotaliDisponibili: number;
  giorniTapering: number;
}

interface BandoAnalysisProps {
  data: BandoData;
  onUpdateRequisito: (index: number, value: boolean) => void;
  onUpdatePassaggio: (index: number, value: boolean) => void;
  onConfirm: () => void;
}

export function BandoAnalysis({
  data,
  onUpdateRequisito,
  onUpdatePassaggio,
  onConfirm,
}: BandoAnalysisProps) {
  const allRequisitiSoddisfatti = data.requisiti.every((r) => r.soddisfatto === true);
  const hasBlockingRequisiti = data.requisiti.some((r) => r.soddisfatto === false);

  return (
    <div className="space-y-6" data-testid="bando-analysis">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Informazioni Generali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ente/Concorso</p>
              <p className="font-semibold">{data.titoloEnte}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-semibold">{data.tipoConcorso}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posti disponibili</p>
              <p className="font-semibold">{data.posti}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scadenza domanda</p>
              <p className="font-semibold text-destructive">{data.scadenzaDomanda}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={hasBlockingRequisiti ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasBlockingRequisiti ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : allRequisitiSoddisfatti ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Requisiti Bloccanti
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasBlockingRequisiti && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium">
              Attenzione: Non soddisfi tutti i requisiti. Verifica prima di procedere.
            </div>
          )}
          <div className="space-y-3">
            {data.requisiti.map((req, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                data-testid={`requisito-${index}`}
              >
                <Checkbox
                  checked={req.soddisfatto === true}
                  onCheckedChange={(checked) =>
                    onUpdateRequisito(index, checked === true)
                  }
                  data-testid={`checkbox-requisito-${index}`}
                />
                <span className="flex-1">{req.titolo}</span>
                {req.soddisfatto === true && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {req.soddisfatto === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Analisi Prove
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Preselettiva</p>
              <Badge
                variant={data.prove.hasPreselettiva ? "default" : "secondary"}
              >
                {data.prove.hasPreselettiva ? "Si" : "No"}
              </Badge>
              {data.prove.hasPreselettiva && (
                <p className="text-xs text-muted-foreground mt-2">
                  70% tempo iniziale su Logica/Quiz
                </p>
              )}
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Banca Dati Ufficiale</p>
              <Badge
                variant={data.prove.hasBancaDati ? "default" : "secondary"}
              >
                {data.prove.hasBancaDati ? "Si" : "No"}
              </Badge>
              {data.prove.hasBancaDati && (
                <p className="text-xs text-muted-foreground mt-2">
                  Strategia specifica in Fase 3
                </p>
              )}
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Penalita Errori</p>
              <Badge variant={data.prove.penalitaErrori ? "destructive" : "secondary"}>
                {data.prove.penalitaErrori || "Nessuna"}
              </Badge>
              {data.prove.penalitaErrori && (
                <p className="text-xs text-muted-foreground mt-2">
                  Strategia di rischio calibrata
                </p>
              )}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{data.prove.tipo}</p>
            <p className="text-sm text-muted-foreground">{data.prove.descrizione}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Tassonomia Materie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.materie.map((materia, index) => (
              <div key={index} className="p-4 bg-muted rounded-lg" data-testid={`materia-${index}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold">{materia.nome}</h4>
                  <Badge variant="outline">Peso: {materia.peso}%</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {materia.microArgomenti.map((arg, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {arg}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Passaggi per l'Iscrizione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.passaggiIscrizione.map((passaggio, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  passaggio.completato ? "bg-green-50 dark:bg-green-900/10" : "bg-muted"
                }`}
                data-testid={`passaggio-${index}`}
              >
                <Checkbox
                  checked={passaggio.completato}
                  onCheckedChange={(checked) =>
                    onUpdatePassaggio(index, checked === true)
                  }
                  data-testid={`checkbox-passaggio-${index}`}
                />
                <div className="flex-1">
                  <span className="font-medium mr-2">Step {passaggio.step}:</span>
                  <span>{passaggio.descrizione}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendario Inverso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{data.oreTotaliDisponibili}h</p>
              <p className="text-sm text-muted-foreground">Ore totali disponibili</p>
            </div>
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg text-center">
              <Calendar className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{data.giorniTapering} giorni</p>
              <p className="text-sm text-muted-foreground">Tapering (scarico cognitivo)</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {data.calendarioInverso.map((periodo, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-muted rounded-lg"
                data-testid={`calendario-${index}`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{periodo.fase}</p>
                  <p className="text-sm text-muted-foreground">
                    {periodo.dataInizio} - {periodo.dataFine}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold">{periodo.giorniDisponibili} gg</p>
                  <p className="text-sm text-muted-foreground">{periodo.oreStimate}h</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={onConfirm}
        disabled={!allRequisitiSoddisfatti}
        data-testid="button-confirm-setup"
      >
        {allRequisitiSoddisfatti ? (
          <>
            Conferma Setup e Passa alla Fase 2
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        ) : (
          "Verifica tutti i requisiti per continuare"
        )}
      </Button>
    </div>
  );
}
