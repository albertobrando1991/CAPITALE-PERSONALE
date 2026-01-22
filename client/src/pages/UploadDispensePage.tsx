import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, BookOpen, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAccessToken } from '@/lib/supabase';

const MATERIE = [
  'Diritto Amministrativo',
  'Diritto Costituzionale',
  'Diritto Civile',
  'Contabilità Pubblica',
  'Diritto del Lavoro',
  'Economia Aziendale',
  'Informatica',
  'Lingua Inglese',
  'Logica',
  'Storia',
  'Geografia',
];

export default function UploadDispensePage() {
  const params = useParams();
  const concorsoId = params.concorsoId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [materia, setMateria] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Carica fonti esistenti 
  const { data: fonti } = useQuery({
    queryKey: ['sq3r-fonti', concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/sq3r/fonti?concorsoId=${concorsoId}`);
      if (!res.ok) throw new Error('Errore caricamento fonti');
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !materia) throw new Error('File e materia obbligatori');

      // Get JWT token for authentication
      const token = await getAccessToken();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('concorsoId', concorsoId!);
      formData.append('materia', materia);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Errore upload: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Errore rete')));

        xhr.open('POST', '/api/sq3r/fonti/upload');

        // Add Authorization header with JWT token
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });
    },
    onSuccess: (data: any) => {
      toast({ title: '✅ Dispensa caricata con successo!' });
      queryClient.invalidateQueries({ queryKey: ['sq3r-fonti', concorsoId] });
      setFile(null);
      setMateria('');
      setUploadProgress(0);

      // Avvia estrazione capitoli automatica 
      estrazioneCapitoliMutation.mutate(data.id);
    },
    onError: () => {
      toast({ title: '❌ Errore durante l\'upload', variant: 'destructive' });
      setUploadProgress(0);
    },
  });

  const estrazioneCapitoliMutation = useMutation({
    mutationFn: async (fonteId: string) => {
      const res = await fetch(`/api/sq3r/fonti/${fonteId}/estrai-capitoli`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Errore estrazione');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${data.capitoliEstratti} capitoli estratti con AI!`,
        description: 'Vai alla Fase 1 per iniziare a studiare',
      });
      queryClient.invalidateQueries({ queryKey: ['sq3r-fonti', concorsoId] });
      queryClient.invalidateQueries({ queryKey: ['sq3r-materie', concorsoId] });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Errore estrazione capitoli',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validazione dimensione (max 50MB) 
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({ title: '❌ File troppo grande (max 50MB)', variant: 'destructive' });
        return;
      }
      // Validazione tipo 
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({ title: '❌ Formato non supportato', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const deleteFonteMutation = useMutation({
    mutationFn: async (fonteId: string) => {
      const res = await fetch(`/api/sq3r/fonti/${fonteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
    },
    onSuccess: () => {
      toast({ title: '🗑️ Fonte eliminata' });
      queryClient.invalidateQueries({ queryKey: ['sq3r-fonti', concorsoId] });
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📤 Carica Dispense</h1>
        <p className="text-muted-foreground">
          Carica i tuoi PDF e l'AI estrarrà automaticamente i capitoli
        </p>
      </div>

      <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600 !text-amber-600" />
        <AlertTitle className="text-amber-900 font-bold">⚠️ Importante: Requisiti PDF</AlertTitle>
        <AlertDescription className="text-amber-800">
          Per garantire una corretta estrazione dei capitoli, assicurati di caricare <strong>PDF testuali</strong> (con testo selezionabile).
          I PDF scansionati come immagini o foto <u>non potranno essere analizzati</u> correttamente dall'AI.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1️⃣ Seleziona il file</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="max-w-xs mx-auto cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Formati supportati: PDF, Word, TXT (max 50MB)
            </p>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between p-3 bg-secondary rounded">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materia */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2️⃣ Seleziona la materia</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Materia di studio</Label>
          <Select value={materia} onValueChange={setMateria}>
            <SelectTrigger>
              <SelectValue placeholder="Scegli una materia..." />
            </SelectTrigger>
            <SelectContent>
              {MATERIE.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Label>Upload in corso...</Label>
            <Progress value={uploadProgress} className="mt-2" />
            <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
          </CardContent>
        </Card>
      )}

      {/* Estrazione in corso */}
      {estrazioneCapitoliMutation.isPending && (
        <Card className="mb-6 border-primary">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="font-medium">🤖 AI sta estraendo i capitoli...</p>
            <p className="text-sm text-muted-foreground">Questo può richiedere 1-2 minuti</p>
          </CardContent>
        </Card>
      )}

      {/* Azioni */}
      <div className="flex gap-2 justify-between mb-8">
        <Button variant="outline" onClick={() => setLocation(`/concorsi/${concorsoId}/setup-fonti`)}>
          ← Indietro
        </Button>
        <Button
          size="lg"
          disabled={!file || !materia || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? (
            <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Caricamento...</>
          ) : (
            '✅ Carica e Estrai Capitoli'
          )}
        </Button>
      </div>

      {/* Fonti caricate */}
      {fonti && fonti.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📚 Dispense caricate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fonti.map((fonte: any) => (
                <div key={fonte.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{fonte.titolo}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{fonte.materia}</Badge>
                        <Badge variant="outline">
                          {(fonte.fileSize / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                        {fonte.numPages && (
                          <Badge variant="outline">{fonte.numPages} pagine</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fonte.numeroTotalePagine > 0 && (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Capitoli estratti
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFonteMutation.mutate(fonte.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}