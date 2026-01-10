import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Plus, Loader2, FileText, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

function MateriaContent({ concorsoId, materiaId }: { concorsoId: string, materiaId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [capitoloToDelete, setCapitoloToDelete] = useState<string | null>(null);
  
  // Form state
  const [titolo, setTitolo] = useState('');
  const [numeroCapitolo, setNumeroCapitolo] = useState('1');
  const [pagineInizio, setPagineInizio] = useState('');
  const [pagineFine, setPagineFine] = useState('');

  // 1. Fetch Materia (dalla lista)
  const { data: materie = [] } = useQuery({
    queryKey: ['/api/sq3r/materie', concorsoId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/sq3r/materie?concorsoId=${concorsoId}`);
      return res.json();
    },
    enabled: !!concorsoId,
  });

  const materia = materie.find((m: any) => m.id === materiaId);

  // 2. Fetch Capitoli
  const { data: capitoli = [], isLoading: isLoadingCapitoli } = useQuery({
    queryKey: ['/api/sq3r/capitoli', materiaId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/sq3r/capitoli?materiaId=${materiaId}`);
      return res.json();
    },
    enabled: !!materiaId,
  });

  // Mutation crea capitolo
  const createCapitoloMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/sq3r/capitoli', {
        ...data,
        materiaId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sq3r/capitoli', materiaId] });
      toast({ title: "Capitolo creato", description: "Capitolo aggiunto con successo." });
      setIsDialogOpen(false);
      setTitolo('');
      setNumeroCapitolo(String(capitoli.length + 2)); // Auto-increment
      setPagineInizio('');
      setPagineFine('');
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titolo) return;
    createCapitoloMutation.mutate({
      numeroCapitolo: parseInt(numeroCapitolo),
      titolo,
      pagineInizio: parseInt(pagineInizio) || 0,
      pagineFine: parseInt(pagineFine) || 0,
    });
  };

  // Mutation elimina capitolo
  const deleteCapitoloMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/sq3r/capitoli/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sq3r/capitoli', materiaId] });
      toast({ title: "Capitolo eliminato", description: "Il capitolo è stato rimosso." });
      setCapitoloToDelete(null);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
      setCapitoloToDelete(null);
    }
  });

  const handleDeleteCapitolo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCapitoloToDelete(id);
  };

  if (!materia && !isLoadingCapitoli) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Materia non trovata</h2>
          <Button onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)}>Indietro</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{materia?.icona || '📚'}</span>
            <h1 className="text-3xl font-bold">{materia?.nomeMateria || 'Caricamento...'}</h1>
          </div>
          <div className="flex gap-4 text-muted-foreground text-sm">
            <span>{capitoli.length} Capitoli</span>
            <span>•</span>
            <span>{materia?.oreStudioTotali?.toFixed(1) || 0}h Studio</span>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Capitolo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Capitolo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <Label>N°</Label>
                  <Input 
                    type="number" 
                    value={numeroCapitolo} 
                    onChange={e => setNumeroCapitolo(e.target.value)} 
                  />
                </div>
                <div className="col-span-3">
                  <Label>Titolo Capitolo</Label>
                  <Input 
                    value={titolo} 
                    onChange={e => setTitolo(e.target.value)} 
                    placeholder="Es. Introduzione al diritto"
                    autoFocus 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pag. Inizio (opz)</Label>
                  <Input 
                    type="number" 
                    value={pagineInizio} 
                    onChange={e => setPagineInizio(e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Pag. Fine (opz)</Label>
                  <Input 
                    type="number" 
                    value={pagineFine} 
                    onChange={e => setPagineFine(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCapitoloMutation.isPending || !titolo}>
                  {createCapitoloMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista Capitoli */}
      <div className="grid gap-4">
        {capitoli.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun capitolo presente</h3>
            <p className="text-muted-foreground mb-6">Inizia aggiungendo il primo capitolo da studiare.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Crea Capitolo Manualmente</Button>
          </Card>
        ) : (
          capitoli.map((cap: any) => {
            const isCompleted = cap.completato;
            const fase = cap.faseCorrente || 'survey';
            
            return (
              <Card 
                key={cap.id} 
                className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                style={{ borderLeftColor: isCompleted ? '#22c55e' : '#3b82f6' }}
                onClick={() => setLocation(`/concorsi/${concorsoId}/fase1/capitolo/${cap.id}`)}
              >
                <CardContent className="p-6 flex items-center gap-6 relative group">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-lg text-slate-600">
                    {cap.numeroCapitolo}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{cap.titolo}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="capitalize">Fase: {fase}</span>
                      {cap.pagineInizio > 0 && <span>Pag. {cap.pagineInizio}-{cap.pagineFine}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isCompleted ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Completato
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Circle className="h-4 w-4 mr-1" /> In corso
                      </Badge>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteCapitolo(e, cap.id)}
                      title="Elimina capitolo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Alert Dialog per eliminazione */}
      <AlertDialog open={!!capitoloToDelete} onOpenChange={(open) => !open && setCapitoloToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo capitolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Tutti i dati associati a questo capitolo (note, evidenziazioni, quiz) verranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => capitoloToDelete && deleteCapitoloMutation.mutate(capitoloToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MateriaPage({ params }: { params: { concorsoId: string, materiaId: string } }) {
  return (
    <ErrorBoundary>
      <MateriaContent concorsoId={params.concorsoId} materiaId={params.materiaId} />
    </ErrorBoundary>
  );
}
