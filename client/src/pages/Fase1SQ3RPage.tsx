import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Target, Plus, Loader2, Trash2 } from 'lucide-react';
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

function Fase1SQ3RContent({ concorsoId }: { concorsoId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMateriaName, setNewMateriaName] = useState('');
  const [materiaToDelete, setMateriaToDelete] = useState<string | null>(null);

  console.log('🔍 Fase1SQ3RContent render - ID:', concorsoId);

  // Fetch concorso
  const { data: concorso, isLoading: concorsoLoading } = useQuery({
    queryKey: [`/api/concorsi/${concorsoId}`],
    enabled: !!concorsoId,
  });

  // Fetch materie SQ3R
  const { data: materie = [], isLoading: materieLoading } = useQuery({
    queryKey: ['/api/sq3r/materie', concorsoId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/sq3r/materie?concorsoId=${concorsoId}`);
      return res.json();
    },
    enabled: !!concorsoId,
  });

  // Mutation per creare materia
  const createMateriaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await apiRequest('POST', '/api/sq3r/materie', {
        concorsoId,
        nomeMateria: nome,
        colore: '#3B82F6', // Default blue
        icona: '📚'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sq3r/materie', concorsoId] });
      toast({
        title: "Materia creata",
        description: "La nuova materia è stata aggiunta con successo.",
      });
      setIsDialogOpen(false);
      setNewMateriaName('');
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la materia.",
        variant: "destructive"
      });
    }
  });

  const handleCreateMateria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMateriaName.trim()) return;
    console.log("Creating materia for concorsoId:", concorsoId);
    createMateriaMutation.mutate(newMateriaName);
  };

  // Mutation per eliminare materia
  const deleteMateriaMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/sq3r/materie/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sq3r/materie', concorsoId] });
      toast({
        title: "Materia eliminata",
        description: "La materia è stata rimossa con successo.",
      });
      setMateriaToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare la materia.",
        variant: "destructive"
      });
      setMateriaToDelete(null);
    }
  });

  const handleDeleteMateria = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMateriaToDelete(id);
  };

  const isLoading = concorsoLoading || materieLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground">Caricamento dashboard SQ3R...</p>
        </div>
      </div>
    );
  }

  if (!concorso) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Concorso non trovato</h2>
          <Button onClick={() => setLocation('/dashboard')}>
            Torna alla Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation(`/dashboard`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            Fase 1: Studio con Metodo SQ3R
          </h1>
          <p className="text-muted-foreground mt-1">
            {concorso.nome || 'Concorso'} <span className="text-xs opacity-50">({concorsoId})</span>
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-2 border-primary/20 dark:border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Progressi Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Materie Totali</div>
              <div className="text-3xl font-bold text-primary">
                {materie.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Capitoli Completati</div>
              <div className="text-3xl font-bold text-status-online">
                {materie.reduce((acc: number, m: any) => acc + (m.capitoliCompletati || 0), 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Ore di Studio</div>
              <div className="text-3xl font-bold text-secondary">
                {materie.reduce((acc: number, m: any) => acc + (m.oreStudioTotali || 0), 0).toFixed(1)}h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materie List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Le Tue Materie</h2>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Materia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Nuova Materia</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateMateria} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Materia</Label>
                  <Input 
                    id="name" 
                    placeholder="Es. Diritto Amministrativo" 
                    value={newMateriaName}
                    onChange={(e) => setNewMateriaName(e.target.value)}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMateriaMutation.isPending || !newMateriaName.trim()}>
                    {createMateriaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crea Materia
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {materie.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nessuna Materia Ancora
            </h3>
            <p className="text-muted-foreground mb-6">
              Aggiungi la tua prima materia per iniziare a studiare.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Materia
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materie.map((materia: any) => {
              const progressPercentage = materia.capitoliTotali > 0
                ? (materia.capitoliCompletati / materia.capitoliTotali) * 100
                : 0;

              return (
                <Card
                  key={materia.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer relative group"
                  onClick={() => setLocation(`/concorsi/${concorsoId}/materie/${materia.id}`)}
                >
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteMateria(e, materia.id)}
                      title="Elimina materia"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className="text-3xl"
                        style={{ color: materia.colore || '#3B82F6' }}
                      >
                        {materia.icona || '📚'}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {materia.nomeMateria}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {materia.capitoliCompletati} / {materia.capitoliTotali} capitoli
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-semibold">
                            {progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progressPercentage} />
                      </div>
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>⏱️ {materia.oreStudioTotali?.toFixed(1) || 0}h studio</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      {materie.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-primary to-secondary text-white text-center">
          <h3 className="text-2xl font-bold mb-2">
            Pronto per Studiare?
          </h3>
          <p className="mb-4 opacity-90">
            Clicca su una materia per iniziare lo studio con il metodo SQ3R
          </p>
        </Card>
      )}

      {/* Alert Dialog per eliminazione */}
      <AlertDialog open={!!materiaToDelete} onOpenChange={(open) => !open && setMateriaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Eliminerà permanentemente la materia
              e tutti i capitoli, note e progressi associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => materiaToDelete && deleteMateriaMutation.mutate(materiaToDelete)}
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

export default function Fase1SQ3RPage({ params }: { params: { concorsoId: string } }) {
  return (
    <ErrorBoundary>
      <Fase1SQ3RContent concorsoId={params.concorsoId} />
    </ErrorBoundary>
  );
}
