import { useState, useEffect } from 'react';
import { Droplets, Plus, TrendingUp, Calendar, Trash2, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HydrationLog {
  id: number;
  date: string;
  glassesCount: number;
  targetGlasses: number;
  lastDrinkAt: string | null;
}

export default function HydrationTracker() {
  const { toast } = useToast();
  const { stats, refreshStats, addGlass } = useBenessere();
  
  const [todayLog, setTodayLog] = useState<HydrationLog | null>(null);
  const [history, setHistory] = useState<HydrationLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTarget, setNewTarget] = useState(8);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  useEffect(() => {
    fetchTodayLog();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (todayLog) {
      setNewTarget(todayLog.targetGlasses);
    }
  }, [todayLog]);

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const fetchTodayLog = async () => {
    try {
      const todayStr = getLocalDateString();
      const res = await fetch(`/api/benessere/hydration/today?date=${todayStr}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTodayLog(data);
      }
    } catch (error) {
      console.error('Errore fetch today log:', error);
    }
  };

  const handleUpdateTarget = async () => {
    try {
      const todayStr = getLocalDateString();
      const res = await fetch('/api/benessere/hydration/target', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target: parseInt(String(newTarget)),
          date: todayStr
        }),
        credentials: 'include'
      });

      if (res.ok) {
        toast({
          title: "Obiettivo Aggiornato",
          description: `Nuovo obiettivo: ${newTarget} bicchieri`,
        });
        setIsEditingTarget(false);
        fetchTodayLog();
      } else {
        throw new Error('Errore aggiornamento');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'obiettivo",
        variant: "destructive"
      });
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/benessere/hydration/history?days=7', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Errore fetch history:', error);
    }
  };

  const handleAddGlass = async () => {
    setIsAdding(true);
    try {
      const todayStr = getLocalDateString();
      // Chiamata diretta invece di usare il context per gestire la risposta avanzata
      const res = await fetch('/api/benessere/hydration/drink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        
        // Aggiorna stats globali
        refreshStats();

        if (data.previousCompleted) {
          // Reset automatico avvenuto
          toast({
            title: "🏆 OBIETTIVO RAGGIUNTO!",
            description: "Ottimo lavoro! Il contatore è stato resettato per un nuovo ciclo.",
            duration: 5000,
            className: "bg-green-500 text-white border-none"
          });
          // Il backend restituisce già il nuovo log vuoto
          setTodayLog(data);
          // Aggiorna storico per mostrare il log appena completato
          await fetchHistory();
        } else {
          // Aggiornamento normale
          toast({
            title: "💧 +1 Bicchiere!",
            description: "Continua così, l'idratazione è fondamentale",
            duration: 2000
          });
          setTodayLog(data);
        }
      } else {
        throw new Error('Errore aggiornamento');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non è stato possibile aggiornare",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      const res = await fetch(`/api/benessere/hydration/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        toast({
          title: "Eliminato",
          description: "Log idratazione eliminato."
        });
        
        // Rimuovi immediatamente dall'UI
        setHistory(prev => prev.filter(log => log.id !== id));
        
        // Se abbiamo eliminato il log di oggi, ricarica todayLog
        if (todayLog && todayLog.id === id) {
          setTodayLog(null); // O resetta a default/null e poi ricarica
          fetchTodayLog();
        }
      } else {
        throw new Error('Errore server');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare.",
        variant: "destructive"
      });
    }
  };

  const handleResetToday = async () => {
    if (!todayLog) return;
    
    try {
      console.log('Resetting hydration log:', todayLog.id);
      const res = await fetch(`/api/benessere/hydration/${todayLog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glassesCount: 0 }),
        credentials: 'include'
      });

      if (res.ok) {
        const updatedLog = await res.json();
        console.log('Reset success, updated log:', updatedLog);
        setTodayLog(updatedLog); // Aggiorna direttamente lo stato
        
        toast({
          title: "Resettato",
          description: "Il contatore di oggi è stato azzerato."
        });
        
        // Aggiorna anche lo storico per riflettere il reset
        await fetchHistory();
        refreshStats();
      } else {
        const errText = await res.text();
        console.error('Reset failed:', errText);
        throw new Error('Errore server: ' + errText);
      }
    } catch (error) {
      console.error('Reset error exception:', error);
      toast({
        title: "Errore",
        description: "Impossibile resettare.",
        variant: "destructive"
      });
    }
  };

  if (!todayLog) {
    return <div>Caricamento...</div>;
  }

  const percentage = Math.round((todayLog.glassesCount / todayLog.targetGlasses) * 100);
  const remaining = Math.max(0, todayLog.targetGlasses - todayLog.glassesCount);

  return (
    <div className="space-y-6">
      {/* Card Principale */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Droplets className="h-6 w-6 text-blue-600" />
                Tracciamento Idratazione
              </CardTitle>
              <CardDescription>
                Obiettivo: {todayLog.targetGlasses} bicchieri al giorno • Cervello disidratato = -20% efficienza cognitiva
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resettare il conteggio di oggi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questo cancellerà i {todayLog.glassesCount} bicchieri registrati oggi e riporterà il conteggio a 0.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetToday} className="bg-red-500 hover:bg-red-600">
                      Conferma Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={isEditingTarget} onOpenChange={setIsEditingTarget}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifica Obiettivo</DialogTitle>
                    <DialogDescription>
                      Imposta il tuo obiettivo giornaliero di bicchieri d'acqua.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 flex items-center gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="text-lg"
                    />
                    <span className="text-muted-foreground">bicchieri</span>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleUpdateTarget}>Salva</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Visualizzazione Oggi */}
          <div className="text-center py-8">
            <div className="text-7xl font-bold text-blue-600 mb-2">
              {todayLog.glassesCount} <span className="text-4xl text-muted-foreground">/ {todayLog.targetGlasses}</span>
            </div>
            <p className="text-muted-foreground mb-4">
              bicchieri oggi
            </p>

            <Progress value={percentage} className="h-4 mb-4" />

            <p className="text-lg font-semibold text-blue-700">
              {remaining === 0 ? (
                <>🎉 Obiettivo Raggiunto!</>
              ) : (
                <>Ancora {remaining} bicchieri per raggiungere l'obiettivo</>
              )}
            </p>
          </div>

          {/* Bottone Aggiungi */}
          <Button
            onClick={handleAddGlass}
            disabled={isAdding}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-16 gap-3"
          >
            <Plus className="h-6 w-6" />
            +1 Bicchiere d'Acqua
          </Button>

          {/* Ultimo Drink */}
          {todayLog.lastDrinkAt && (
            <p className="text-center text-sm text-muted-foreground">
              Ultimo bicchiere: {new Date(todayLog.lastDrinkAt).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">💡 Perché è Importante</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Il cervello è composto per il 75% da acqua</li>
              <li>La disidratazione riduce le performance cognitive del 20%</li>
              <li>Bevi 1 bicchiere ogni ora durante lo studio</li>
              <li>Evita picchi di sete: idratati costantemente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Storico Settimanale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Storico Ultimi 7 Giorni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((log) => {
              const dayPercentage = Math.round((log.glassesCount / log.targetGlasses) * 100);
              const date = new Date(log.date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div key={log.id} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-semibold">
                    {isToday ? 'Oggi' : date.toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <div className="flex-1">
                    <Progress value={dayPercentage} className="h-3" />
                  </div>
                  <div className="w-20 text-right text-sm font-semibold">
                    {log.glassesCount}/{log.targetGlasses} 🥤
                  </div>
                  {dayPercentage >= 100 && (
                    <span className="text-green-600">✓</span>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vuoi davvero eliminare il registro idratazione del {date.toLocaleDateString()}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteLog(log.id)} className="bg-red-500 hover:bg-red-600">
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>

          {/* Stats Settimanali */}
          {history.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statistiche Settimanali
              </p>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-muted-foreground">Media/giorno</p>
                  <p className="text-xl font-bold text-blue-600">
                    {(history.reduce((sum, log) => sum + log.glassesCount, 0) / history.length).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Giorni obiettivo</p>
                  <p className="text-xl font-bold text-green-600">
                    {history.filter(log => log.glassesCount >= log.targetGlasses).length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Streak</p>
                  <p className="text-xl font-bold text-orange-600">
                    {calculateStreak(history)} 🔥
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper: calcola streak di giorni consecutivi con obiettivo raggiunto
function calculateStreak(history: HydrationLog[]): number {
  let streak = 0;
  const sorted = [...history].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const log of sorted) {
    if (log.glassesCount >= log.targetGlasses) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}