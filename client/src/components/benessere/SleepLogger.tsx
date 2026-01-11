import { useState, useEffect } from 'react';
import { Moon, Save, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface SleepLog {
  id: number;
  date: string;
  bedtime: string | null;
  wakeTime: string | null;
  totalHours: number | null;
  qualityRating: number | null;
  moodOnWaking: string | null;
  notes: string | null;
}

export default function SleepLogger() {
  const { toast } = useToast();
  const { refreshStats } = useBenessere();
  
  const [date, setDate] = useState(
    new Date(Date.now() - 86400000).toISOString().split('T')[0]
  ); // Ieri di default
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [qualityRating, setQualityRating] = useState<number>(3);
  const [moodOnWaking, setMoodOnWaking] = useState('refreshed');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<SleepLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/benessere/sleep?startDate=' + 
        new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Errore fetch sleep history:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/benessere/sleep/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        toast({
          title: "Eliminato",
          description: "Log del sonno eliminato con successo."
        });
        // Rimuovi dalla lista locale
        setHistory(prev => prev.filter(log => log.id !== id));
        
        // Aggiorna dashboard globale
        await refreshStats();
        
        // Se abbiamo eliminato il log della data corrente nel form, resetta il form?
        // Opzionale, per ora lasciamo il form com'è.
      } else {
        throw new Error('Errore eliminazione');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il log.",
        variant: "destructive"
      });
    }
  };

  const calculateTotalHours = (): number => {
    if (!bedtime || !wakeTime) return 0;

    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);

    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;

    // Se wake time è prima di bedtime, aggiungi 24h
    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    const totalMinutes = wakeMinutes - bedMinutes;
    return Math.round((totalMinutes / 60) * 10) / 10;
  };

  const handleSave = async () => {
    setIsSaving(true);

    const totalHours = calculateTotalHours();

    try {
      const res = await fetch('/api/benessere/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date,
          bedtime,
          wakeTime,
          totalHours,
          qualityRating,
          moodOnWaking,
          notes: notes || null
        })
      });

      if (res.ok) {
        toast({
          title: "💤 Sonno Registrato!",
          description: `${totalHours} ore di sonno con qualità ${qualityRating}/5`,
          duration: 3000
        });

        await fetchHistory();
        await refreshStats();

        // Reset form
        setDate(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
        setNotes('');
      } else {
        throw new Error('Errore salvataggio');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non è stato possibile salvare il log",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalHours = calculateTotalHours();

  return (
    <div className="space-y-6">
      {/* Form Registrazione */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Moon className="h-6 w-6 text-indigo-600" />
            Registra il Tuo Sonno
          </CardTitle>
          <CardDescription>
            Il sonno consolida la memoria a lungo termine • Target: 7-9 ore
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              max={new Date().toISOString().split('T')[0]} 
            />
          </div>

          {/* Orari */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedtime">Ora Addormentamento</Label>
              <Input 
                id="bedtime" 
                type="time" 
                value={bedtime} 
                onChange={(e) => setBedtime(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wakeTime">Ora Risveglio</Label>
              <Input 
                id="wakeTime" 
                type="time" 
                value={wakeTime} 
                onChange={(e) => setWakeTime(e.target.value)} 
              />
            </div>
          </div>

          {/* Calcolo Ore */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
            <p className="text-sm text-muted-foreground mb-1">Ore Totali di Sonno</p>
            <p className="text-4xl font-bold text-indigo-600">
              {totalHours} <span className="text-xl">ore</span>
            </p>
            {totalHours > 0 && (
              <p className="text-xs mt-2 text-muted-foreground">
                {totalHours < 7 && '⚠️ Sotto il minimo raccomandato (7h)'}
                {totalHours >= 7 && totalHours <= 9 && '✅ Range ottimale'}
                {totalHours > 9 && '💤 Oltre il range ottimale'}
              </p>
            )}
          </div>

          {/* Qualità */}
          <div className="space-y-2">
            <Label>Qualità del Sonno</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button 
                  key={rating} 
                  onClick={() => setQualityRating(rating)} 
                  className={`text-3xl transition-all ${ 
                    rating <= qualityRating ? 'scale-110' : 'opacity-30' 
                  }`} 
                >
                  ⭐
                </button> 
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {qualityRating === 1 && 'Pessimo - Mi sono svegliato spesso'}
              {qualityRating === 2 && 'Scarso - Sonno agitato'}
              {qualityRating === 3 && 'Normale - Sonno accettabile'}
              {qualityRating === 4 && 'Buono - Mi sento riposato'}
              {qualityRating === 5 && 'Eccellente - Sonno profondo e ristoratore'}
            </p>
          </div>

          {/* Umore al Risveglio */}
          <div className="space-y-2">
            <Label htmlFor="mood">Umore al Risveglio</Label>
            <Select value={moodOnWaking} onValueChange={setMoodOnWaking}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energized">⚡ Energico</SelectItem>
                <SelectItem value="refreshed">😊 Riposato</SelectItem>
                <SelectItem value="tired">😴 Stanco</SelectItem>
                <SelectItem value="groggy">🥱 Intontito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionali)</Label>
            <Textarea 
              id="notes" 
              placeholder="Es: Mi sono svegliato alle 3 AM, ho fatto un sogno strano..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
            />
          </div>

          {/* Salva */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !bedtime || !wakeTime} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2" 
            size="lg" 
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Salvataggio...' : 'Salva Sonno'}
          </Button>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2">🧠 Sonno e Consolidamento Memoria</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Durante il sonno REM il cervello consolida le informazioni</li>
              <li>Studiare di notte riducendo il sonno è controproducente</li>
              <li>Il sonno trasferisce info dalla memoria breve a quella a lungo termine</li>
              <li>7-9 ore sono il range ottimale per gli studenti</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Storico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Storico Sonno (Ultimi 7 Giorni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((log) => {
              const date = new Date(log.date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div 
                  key={log.id} 
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg" 
                >
                  <div className="w-28">
                    <p className="text-sm font-semibold">
                      {isToday ? 'Oggi' : date.toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Durata</p>
                      <p className="font-bold text-indigo-600">
                        {log.totalHours ? `${log.totalHours}h` : '--'}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Qualità</p>
                      <p>
                        {log.qualityRating ? '⭐'.repeat(log.qualityRating) : '--'}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Umore</p>
                      <p className="text-xs">
                        {log.moodOnWaking === 'energized' && '⚡ Energico'}
                        {log.moodOnWaking === 'refreshed' && '😊 Riposato'}
                        {log.moodOnWaking === 'tired' && '😴 Stanco'}
                        {log.moodOnWaking === 'groggy' && '🥱 Intontito'}
                        {!log.moodOnWaking && '--'}
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo log?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Questa azione non può essere annullata. Il log del sonno verrà rimosso permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(log.id)} className="bg-red-500 hover:bg-red-600">
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}

            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nessun dato disponibile. Inizia a registrare il tuo sonno!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}