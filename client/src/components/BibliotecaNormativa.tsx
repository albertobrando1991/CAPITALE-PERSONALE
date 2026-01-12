import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  ExternalLink,
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredNormative = normative.filter((norm) =>
    norm.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Normative Caricate:</p>
              <Badge variant="outline" className="text-[10px]">
                {filteredNormative.length} su {normative.length}
              </Badge>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca normativa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {filteredNormative.length > 0 ? (
                filteredNormative.map((norm) => (
                  <div
                    key={norm.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    data-testid={`normativa-${norm.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getStatoIcon(norm.stato)}
                      <span className="text-sm truncate" title={norm.nome}>
                        {norm.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {norm.articoliAnalizzati} art.
                      </Badge>
                      {norm.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open(norm.url, "_blank")}
                          title="Apri su Normattiva"
                        >
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground italic">
                  Nessuna normativa trovata per "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
