import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Layers,
  Upload,
  Play,
  Settings,
  FileText,
  CheckCircle,
  Clock,
  BookOpen,
} from "lucide-react";

interface FlashcardStats {
  totali: number;
  daRipassareOggi: number;
  masterate: number;
  inApprendimento: number;
}

interface FlashcardGeneratorProps {
  materia?: string;
  fonte?: string;
  stats?: FlashcardStats;
  isLoading?: boolean;
  onUploadPdf?: (file: File) => void;
  onStartSession?: () => void;
  disabled?: boolean;
}

export function FlashcardGenerator({
  materia = "Nessuna materia selezionata",
  fonte,
  stats = { totali: 0, daRipassareOggi: 0, masterate: 0, inApprendimento: 0 },
  isLoading = false,
  onUploadPdf,
  onStartSession,
  disabled = false,
}: FlashcardGeneratorProps) {
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

  const masteratePercentage = stats.totali > 0 
    ? Math.round((stats.masterate / stats.totali) * 100) 
    : 0;

  return (
    <Card data-testid="card-flashcard-generator">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Flashcard Generator AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Materia:</span>
            <span className="text-sm font-medium" data-testid="text-materia">
              {materia}
            </span>
          </div>
          {fonte && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Fonte:</span>
              <span className="text-sm text-muted-foreground truncate max-w-[200px]" data-testid="text-fonte">
                {fonte}
              </span>
            </div>
          )}
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          data-testid="dropzone-pdf"
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
          <p className="text-sm font-medium">Carica PDF</p>
          <p className="text-xs text-muted-foreground">
            Trascina o{" "}
            <button
              type="button"
              className="text-primary underline"
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) fileInputRef.current?.click();
              }}
              disabled={disabled}
              data-testid="button-select-pdf"
            >
              seleziona file
            </button>
          </p>
        </div>

        {stats.totali > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Carte Generate:
              </span>
              <Badge variant="secondary" data-testid="badge-carte-totali">
                {stats.totali}
              </Badge>
            </div>

            <div className="space-y-2 text-sm pl-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-yellow-600">
                  <Clock className="h-3 w-3" />
                  Da Ripassare Oggi:
                </span>
                <span className="font-medium" data-testid="text-da-ripassare">
                  {stats.daRipassareOggi}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Masterate:
                </span>
                <span className="font-medium" data-testid="text-masterate">
                  {stats.masterate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-blue-600">
                  <BookOpen className="h-3 w-3" />
                  In Apprendimento:
                </span>
                <span className="font-medium" data-testid="text-in-apprendimento">
                  {stats.inApprendimento}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Progresso Mastery</span>
                <span>{masteratePercentage}%</span>
              </div>
              <Progress value={masteratePercentage} className="h-2" />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={onStartSession}
            disabled={disabled || stats.totali === 0 || isLoading}
            data-testid="button-inizia-sessione"
          >
            <Play className="h-4 w-4 mr-2" />
            Inizia Sessione
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={disabled}
            data-testid="button-impostazioni"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
