import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
} from "lucide-react";

interface Normativa {
  id: string;
  nome: string;
  articoliAnalizzati: number;
  stato: "caricato" | "elaborazione" | "completato";
}

interface BibliotecaNormativaProps {
  normative?: Normativa[];
  domandeGenerate?: number;
  quizTipoConcorso?: number;
  isLoading?: boolean;
  onUploadPdf?: (file: File) => void;
  onGoToQuiz?: () => void;
  onViewStats?: () => void;
  disabled?: boolean;
}

export function BibliotecaNormativa({
  normative = [],
  domandeGenerate = 0,
  quizTipoConcorso = 0,
  isLoading = false,
  onUploadPdf,
  onGoToQuiz,
  onViewStats,
  disabled = false,
}: BibliotecaNormativaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf" && onUploadPdf) {
      onUploadPdf(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPdf) {
      onUploadPdf(file);
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case "completato":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "elaborazione":
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card data-testid="card-biblioteca-normativa">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Biblioteca Normativa AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          data-testid="dropzone-normativa"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={disabled}
          />
          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Carica Nuova Legge</p>
          <p className="text-xs text-muted-foreground">
            PDF (L. 241/90, Costituzione, ecc.)
          </p>
        </div>

        {normative.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Normative Caricate:</p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {normative.map((norm) => (
                <div
                  key={norm.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  data-testid={`normativa-${norm.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatoIcon(norm.stato)}
                    <span className="text-sm truncate">{norm.nome}</span>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2">
                    {norm.articoliAnalizzati} art.
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {(domandeGenerate > 0 || quizTipoConcorso > 0) && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Domande Generate:
              </span>
              <Badge data-testid="badge-domande-generate">{domandeGenerate}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Quiz Tipo Concorso:
              </span>
              <Badge variant="secondary" data-testid="badge-quiz-tipo">
                {quizTipoConcorso}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={onGoToQuiz}
            disabled={disabled || domandeGenerate === 0 || isLoading}
            data-testid="button-vai-quiz-normativa"
          >
            <Target className="h-4 w-4 mr-2" />
            Vai ai Quiz
          </Button>
          <Button
            variant="outline"
            onClick={onViewStats}
            disabled={disabled || normative.length === 0}
            data-testid="button-vedi-analisi-normativa"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
