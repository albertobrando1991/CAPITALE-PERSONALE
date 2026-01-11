import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Utensils, Zap, AlertTriangle, Clock, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useBenessere } from '@/contexts/BenessereContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NutritionLog {
  id: number;
  mealTime: string;
  mealType: string;
  description: string;
  energyLevelBefore: number;
  energyLevelAfter: number;
  brainFog: boolean;
  glycemicSpike: boolean;
}

export default function NutritionTracker() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshStats } = useBenessere();
  const [isLogging, setIsLogging] = useState(false);

  // Form State
  const [mealType, setMealType] = useState('lunch');
  const [description, setDescription] = useState('');
  const [energyBefore, setEnergyBefore] = useState([7]);
  const [energyAfter, setEnergyAfter] = useState([7]);
  const [brainFog, setBrainFog] = useState(false);
  const [glycemicSpike, setGlycemicSpike] = useState(false);

  // Helper per data locale YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
  };

  const todayDate = getLocalDate();

  // Fetch Logs
  const { data: logs = [] } = useQuery({
    queryKey: ['/api/benessere/nutrition', { startDate: todayDate }],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/benessere/nutrition?startDate=${todayDate}`);
      return res.json();
    }
  });

  // Mutation
  const logMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/benessere/nutrition', data);
      return res.json();
    },
    onSuccess: (newLog) => {
      toast({
        title: "Pasto registrato",
        description: "Il tuo livello di energia è stato tracciato."
      });
      
      // Optimistic update per aggiunta
      queryClient.setQueryData(
        ['/api/benessere/nutrition', { startDate: todayDate }],
        (oldData: NutritionLog[] | undefined) => oldData ? [newLog, ...oldData] : [newLog]
      );
      
      refreshStats();
      setIsLogging(false);
      // Reset form
      setDescription('');
      setEnergyBefore([7]);
      setEnergyAfter([7]);
      setBrainFog(false);
      setGlycemicSpike(false);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile registrare il pasto.",
        variant: "destructive"
      });
    }
  });

  // Delete Mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/benessere/nutrition/${id}`);
    },
    onSuccess: (_, id) => {
      // Optimistic update: rimuovi immediatamente l'elemento dalla cache
      queryClient.setQueryData(
        ['/api/benessere/nutrition', { startDate: todayDate }],
        (oldData: NutritionLog[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(log => log.id !== id);
        }
      );

      toast({
        title: "Pasto eliminato",
        description: "Il registro è stato aggiornato."
      });
      
      // NON invalidare per evitare refetch che potrebbe riportare dati vecchi se il DB è lento
      // queryClient.invalidateQueries({ queryKey: ['/api/benessere/nutrition'] });
      
      refreshStats();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il pasto.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({
        title: "Descrizione mancante",
        description: "Inserisci cosa hai mangiato",
        variant: "destructive"
      });
      return;
    }

    logMealMutation.mutate({
      mealTime: new Date().toISOString(),
      mealType,
      description,
      energyLevelBefore: energyBefore[0],
      energyLevelAfter: energyAfter[0],
      brainFog,
      glycemicSpike
    });
  };

  const getEnergyColor = (level: number) => {
    if (level >= 8) return 'text-green-600';
    if (level >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Log Form / Summary */}
      <Card className="md:col-span-1 border-2 border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-green-600" />
            Nutrizione & Energia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isLogging ? (
            <div className="text-center py-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                <Zap className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Traccia l'impatto del cibo</h3>
                <p className="text-sm text-muted-foreground px-4">
                  Registra cosa mangi e come ti senti dopo per ottimizzare la tua concentrazione.
                </p>
              </div>
              <Button onClick={() => setIsLogging(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Registra Pasto
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label>Tipo Pasto</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Colazione</SelectItem>
                    <SelectItem value="lunch">Pranzo</SelectItem>
                    <SelectItem value="dinner">Cena</SelectItem>
                    <SelectItem value="snack">Spuntino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cosa hai mangiato?</Label>
                <Textarea 
                  placeholder="Es. Pasta al pesto, Insalata..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Energia PRIMA (1-10)</Label>
                    <span className={`font-bold ${getEnergyColor(energyBefore[0])}`}>
                      {energyBefore[0]}
                    </span>
                  </div>
                  <Slider 
                    value={energyBefore} 
                    onValueChange={setEnergyBefore} 
                    max={10} 
                    min={1} 
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Energia DOPO (1-10)</Label>
                    <span className={`font-bold ${getEnergyColor(energyAfter[0])}`}>
                      {energyAfter[0]}
                    </span>
                  </div>
                  <Slider 
                    value={energyAfter} 
                    onValueChange={setEnergyAfter} 
                    max={10} 
                    min={1} 
                    step={1} 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="fog" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Brain Fog / Sonnolenza?
                </Label>
                <Switch 
                  id="fog" 
                  checked={brainFog} 
                  onCheckedChange={setBrainFog} 
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="spike" className="flex items-center gap-2 cursor-pointer">
                  <Zap className="h-4 w-4 text-red-500" />
                  Picco Glicemico?
                </Label>
                <Switch 
                  id="spike" 
                  checked={glycemicSpike} 
                  onCheckedChange={setGlycemicSpike} 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsLogging(false)}>
                  Annulla
                </Button>
                <Button className="flex-1" onClick={handleSubmit}>
                  Salva
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History List */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Diario Alimentare di Oggi</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Nessun pasto registrato oggi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: NutritionLog) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center shrink-0
                    ${log.brainFog || log.glycemicSpike ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                  `}>
                    <Utensils className="h-6 w-6" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold capitalize">{log.mealType}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.mealTime), 'HH:mm')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{log.description || "Nessuna descrizione"}</p>
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="outline" className="gap-1">
                        ⚡ {log.energyLevelBefore} → {log.energyLevelAfter}
                      </Badge>
                      
                      {log.brainFog && (
                        <Badge variant="destructive" className="gap-1 bg-orange-500 hover:bg-orange-600">
                          ☁️ Brain Fog
                        </Badge>
                      )}
                      
                      {log.glycemicSpike && (
                        <Badge variant="destructive" className="gap-1">
                          📈 Picco Glicemico
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo pasto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Questa azione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteMealMutation.mutate(log.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
