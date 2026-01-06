import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { RotateCcw, Home, CheckCircle, XCircle, Clock, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Simulazione, DettagliMateria, DomandaSimulazione } from "@shared/schema";

interface SimulazioneReportProps {
  simulazione: Simulazione;
  onRifaiSimulazione: () => void;
  concorsoId?: string;
}

export function SimulazioneReport({ simulazione, onRifaiSimulazione, concorsoId }: SimulazioneReportProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/simulazioni/${simulazione.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulazioni"] });
      toast({
        title: "Simulazione eliminata",
        description: "La simulazione è stata eliminata con successo.",
      });
      if (concorsoId) {
        setLocation(`/concorsi/${concorsoId}/simulazioni`);
      } else {
        setLocation("/simulazioni");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare la simulazione",
        variant: "destructive",
      });
    },
  });

  const handleElimina = () => {
    if (window.confirm("Sei sicuro di voler eliminare questa simulazione? L'azione non può essere annullata.")) {
      deleteMutation.mutate();
    }
  };

  if (!simulazione.completata) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Questa simulazione non è ancora completata.</p>
        </CardContent>
      </Card>
    );
  }

  const punteggio = simulazione.punteggio || 0;
  const percentualeCorrette = simulazione.percentualeCorrette || 0;
  const dettagliPerMateria = (simulazione.dettagliPerMateria || {}) as Record<string, DettagliMateria>;
  const domande = (simulazione.domandeERisposte || []) as DomandaSimulazione[];

  // Determina il colore del punteggio
  const getPunteggioColor = (punteggio: number) => {
    if (punteggio >= 70) return "text-green-600 dark:text-green-400";
    if (punteggio >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPunteggioBgColor = (punteggio: number) => {
    if (punteggio >= 70) return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    if (punteggio >= 50) return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
  };

  // Prepara dati per il grafico radar
  const radarData = Object.entries(dettagliPerMateria).map(([materia, dettagli]) => ({
    materia: materia.length > 20 ? materia.substring(0, 17) + '...' : materia,
    materiaFull: materia,
    percentuale: dettagli.percentuale || 0,
    corrette: dettagli.corrette || 0,
    errate: dettagli.errate || 0,
    nonDate: dettagli.nonDate || 0,
    totali: (dettagli.corrette || 0) + (dettagli.errate || 0) + (dettagli.nonDate || 0),
  }));

  // Domande errate
  const domandeErrate = domande.filter((d) => {
    return d.rispostaUtente && d.rispostaUtente.toUpperCase() !== d.rispostaCorretta.toUpperCase();
  });

  // Formatta il tempo
  const formatTime = (secondi: number) => {
    const minuti = Math.floor(secondi / 60);
    const sec = secondi % 60;
    return `${minuti}m ${sec}s`;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      {/* Header con punteggio principale */}
      <Card className={`${getPunteggioBgColor(punteggio)} border-2`}>
        <CardContent className="p-8 text-center">
          <h1 className="text-5xl font-bold mb-2">
            <span className={getPunteggioColor(punteggio)}>
              {punteggio.toFixed(1)}%
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            Punteggio Finale
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{Math.round((percentualeCorrette / 100) * domande.length)} corrette</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{domandeErrate.length} errate</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>
                {simulazione.tempoTrascorsoSecondi
                  ? formatTime(simulazione.tempoTrascorsoSecondi)
                  : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche per materia */}
      {Object.keys(dettagliPerMateria).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafico Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Performance per Materia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis 
                    dataKey="materia" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                  />
                  <Radar 
                    name="Percentuale Corrette" 
                    dataKey="percentuale" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold mb-2">{data.materiaFull}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                            Corrette: {data.corrette}/{data.totali} ({data.percentuale.toFixed(1)}%)
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400">Errate: {data.errate}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Non risposte: {data.nonDate}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabella dettagli per materia */}
          <Card>
            <CardHeader>
              <CardTitle>Dettagli per Materia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Materia</TableHead>
                      <TableHead className="text-center">Corrette</TableHead>
                      <TableHead className="text-center">Errate</TableHead>
                      <TableHead className="text-center">Non Date</TableHead>
                      <TableHead className="text-center">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(dettagliPerMateria).map(([materia, dettagli]) => (
                      <TableRow key={materia}>
                        <TableCell className="font-medium break-words">{materia}</TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400">
                          {dettagli.corrette}
                        </TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400">
                          {dettagli.errate}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 dark:text-gray-400">
                          {dettagli.nonDate}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              dettagli.percentuale >= 70
                                ? "default"
                                : dettagli.percentuale >= 50
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {dettagli.percentuale.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domande errate con spiegazioni */}
      {domandeErrate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Domande Errate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {domandeErrate.map((domanda, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-2"
              >
                <p className="font-semibold">{domanda.domanda}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-red-600">❌ La tua risposta: </span>
                    <span>
                      {domanda.rispostaUtente} -{" "}
                      {domanda.opzioni[domanda.rispostaUtente?.charCodeAt(0)! - 65] || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">✅ Risposta corretta: </span>
                    <span>
                      {domanda.rispostaCorretta} -{" "}
                      {domanda.opzioni[domanda.rispostaCorretta.charCodeAt(0) - 65]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pulsanti azione */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8">
        <Button 
          onClick={() => {
            if (concorsoId) {
              setLocation(`/concorsi/${concorsoId}/simulazione/${simulazione.id}/rivedi`);
            }
          }}
          variant="outline"
          className="flex-1 sm:flex-none min-h-[44px]"
          disabled={!concorsoId}
        >
          <Eye className="mr-2 h-4 w-4" />
          🔍 Rivedi Risposte
        </Button>
        
        <Button 
          onClick={onRifaiSimulazione}
          variant="default"
          className="flex-1 sm:flex-none min-h-[44px]"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          🔄 Rifai Simulazione
        </Button>
        
        <Button 
          onClick={handleElimina}
          variant="destructive"
          className="flex-1 sm:flex-none min-h-[44px]"
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          🗑️ Elimina
        </Button>
      </div>
    </div>
  );
}
