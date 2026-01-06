import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from '@/components/ui/progress';

interface PDFUploaderProps {
  capitoloId: string;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  pdfFileSize?: number | null;
  onUploadSuccess: (data: any) => void;
}

export function PDFUploader({
  capitoloId,
  pdfUrl,
  pdfFileName,
  pdfFileSize,
  onUploadSuccess
}: PDFUploaderProps) {
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Mutation upload
  const { mutate: uploadPDF, isPending: uploading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      // 🆕 XMLHttpRequest per tracking progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload fallito'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Errore di rete')));

        xhr.open('POST', `/api/sq3r/capitoli/${capitoloId}/upload-pdf`);
        xhr.withCredentials = true; // Importante per sessione
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      toast({ title: 'PDF caricato con successo!' });
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
      onUploadSuccess(data);
    },
    onError: () => {
      toast({ title: 'Errore nel caricamento del PDF', variant: 'destructive' });
      setUploadProgress(0);
    }
  });
  
  // Mutation delete
  const { mutate: deletePDF, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sq3r/capitoli/${capitoloId}/pdf`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'PDF eliminato' });
      queryClient.invalidateQueries({ queryKey: ['capitolo', capitoloId] });
    },
    onError: () => {
      toast({ title: 'Errore nell\'eliminazione', variant: 'destructive' });
    }
  });
  
  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Solo file PDF sono supportati', variant: 'destructive' });
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast({ title: 'Il file è troppo grande (max 50MB)', variant: 'destructive' });
      return;
    }
    
    uploadPDF(file);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  if (pdfFileName) {
    return (
      <Card className="p-4 border-dashed border-2 border-green-200 bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full border shadow-sm">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-green-900 flex items-center gap-2">
                {pdfFileName}
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </p>
              {pdfFileSize && (
                <p className="text-xs text-green-700">{formatFileSize(pdfFileSize)}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Pulsante Apri rimosso perché il PDF è caricato lazy. Usa il viewer principale. */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletePDF()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card
      className={`p-8 border-dashed border-2 text-center transition-all cursor-pointer ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className="bg-blue-100 p-4 rounded-full">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-blue-600" />
          )}
        </div>
        
        <div className="w-full">
          <h3 className="font-semibold text-lg">
            {uploading ? 'Caricamento in corso...' : 'Carica il PDF del capitolo'}
          </h3>
          {uploading && (
             <div className="mt-2 w-full max-w-xs mx-auto space-y-1">
               <Progress value={uploadProgress} className="h-2" />
               <p className="text-xs text-gray-500">{uploadProgress}%</p>
             </div>
          )}
          {!uploading && (
            <>
              <p className="text-sm text-gray-500 mt-1">
                Trascina qui il file o clicca per selezionare
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Max 50MB • Solo PDF
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}