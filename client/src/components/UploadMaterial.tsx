import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface UploadMaterialProps {
  onUpload?: (file: File, title: string, type: string) => Promise<void>;
  onCancel?: () => void;
}

export function UploadMaterial({ onUpload, onCancel }: UploadMaterialProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      if (!title) {
        setTitle(droppedFile.name.replace(".pdf", ""));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(".pdf", ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !type) return;

    setIsUploading(true);
    try {
      await onUpload?.(file, title, type);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full max-w-lg" data-testid="upload-material">
      <CardHeader>
        <CardTitle>Carica Materiale</CardTitle>
        <CardDescription>
          Carica un PDF per generare flashcard e quiz automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Trascina qui il tuo PDF</p>
                  <p className="text-sm text-muted-foreground">
                    oppure{" "}
                    <button
                      type="button"
                      className="text-primary font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      sfoglia
                    </button>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-file"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={removeFile}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              placeholder="Es. Legge 241/1990"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo di Materiale</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-type">
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normativa">Normativa</SelectItem>
                <SelectItem value="giurisprudenza">Giurisprudenza</SelectItem>
                <SelectItem value="manuale">Manuale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              data-testid="button-cancel-upload"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!file || !title || !type || isUploading}
              data-testid="button-submit-upload"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Carica
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
