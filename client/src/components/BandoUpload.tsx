import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, FileText, X, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface BandoUploadProps {
  onAnalyze: (file: File) => Promise<void>;
  isAnalyzing: boolean;
}

export function BandoUpload({ onAnalyze, isAnalyzing }: BandoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Per favore carica un file PDF");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Per favore carica un file PDF");
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    await onAnalyze(file);
  };

  const removeFile = () => {
    setFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full" data-testid="bando-upload">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Carica il Bando del Concorso
        </CardTitle>
        <CardDescription>
          L'AI analizera automaticamente il bando ed estrarra tutte le informazioni necessarie: 
          requisiti, materie, date e passaggi per l'iscrizione.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : file
              ? "border-green-500 bg-green-50 dark:bg-green-900/10"
              : "border-muted-foreground/25"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Trascina qui il bando in PDF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  oppure{" "}
                  <button
                    type="button"
                    className="text-primary font-medium underline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-browse-file"
                  >
                    sfoglia dal computer
                  </button>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Formato supportato: PDF (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-bando-file"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-card rounded-lg border max-w-md mx-auto">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={removeFile}
                  disabled={isAnalyzing}
                  data-testid="button-remove-bando"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {file && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isAnalyzing}
            data-testid="button-analyze-bando"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Analizza con AI
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
