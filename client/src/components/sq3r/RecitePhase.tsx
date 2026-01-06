import { useState, useEffect, useRef } from 'react'; 
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label'; 
import { Badge } from '@/components/ui/badge'; 
import { Play, Pause, RotateCcw, Save } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast'; 

interface RecitePhaseProps { 
  capitolo: any; 
  onComplete: () => void; 
} 

export default function RecitePhase({ capitolo, onComplete }: RecitePhaseProps) { 
  const { toast } = useToast(); 
  const queryClient = useQueryClient(); 
  
  // Inizializza stato dai dati esistenti 
  const [timer, setTimer] = useState(capitolo.reciteData?.tempoSecondi || 0); 
  const [isRunning, setIsRunning] = useState(false); 
  const [valutazione, setValutazione] = useState(capitolo.reciteData?.valutazione || 0); 
  const [noteRiflessione, setNoteRiflessione] = useState(capitolo.reciteData?.noteRiflessione || ''); 
  const [concettiDaRivedere, setConcettiDaRivedere] = useState(capitolo.reciteData?.concettiDaRivedere?.join('\n') || ''); 
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState<Date | null>(null); 
  
  const intervalRef = useRef<NodeJS.Timeout>(); 
  const autoSaveRef = useRef<NodeJS.Timeout>(); 

  // Timer 
  useEffect(() => { 
    if (isRunning) { 
      intervalRef.current = setInterval(() => { 
        setTimer(t => t + 1); 
      }, 1000); 
    } 
    return () => clearInterval(intervalRef.current); 
  }, [isRunning]); 

  // Auto-save mutation 
  const autoSaveMutation = useMutation({ 
    mutationFn: async (data: any) => { 
      const res = await fetch(`/api/sq3r/capitoli/${capitolo.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data), 
      }); 
      if (!res.ok) throw new Error('Errore salvataggio'); 
      return res.json(); 
    }, 
    onSuccess: () => { 
      setUltimoSalvataggio(new Date()); 
      queryClient.invalidateQueries({ queryKey: ['sq3r-capitolo', capitolo.id] }); 
    }, 
  }); 

  // Auto-save ogni 10 secondi 
  useEffect(() => { 
    const hasDati = valutazione > 0 || noteRiflessione.trim() || concettiDaRivedere.trim(); 
    
    if (hasDati) { 
      autoSaveRef.current = setInterval(() => { 
        autoSave(); 
      }, 10000); // 10 secondi 
    } 
    
    return () => clearInterval(autoSaveRef.current); 
  }, [valutazione, noteRiflessione, concettiDaRivedere, timer]); 

  const autoSave = () => { 
    const reciteData = { 
      tempoSecondi: timer, 
      valutazione, 
      noteRiflessione: noteRiflessione.trim(), 
      concettiDaRivedere: concettiDaRivedere.trim().split('\n').filter(c => c), 
    }; 
    
    autoSaveMutation.mutate({ reciteData }); 
  }; 

  // Salvataggio manuale 
  const handleSalvaProgressi = () => { 
    autoSave(); 
    toast({ title: '💾 Progressi salvati' }); 
  }; 

  // Salvataggio al blur 
  const handleBlur = () => { 
    if (valutazione > 0 || noteRiflessione.trim() || concettiDaRivedere.trim()) { 
      autoSave(); 
    } 
  }; 

  // Completamento fase 
  const completaMutation = useMutation({ 
    mutationFn: async () => { 
      const res = await fetch(`/api/sq3r/capitoli/${capitolo.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          reciteData: { 
            tempoSecondi: timer, 
            valutazione, 
            noteRiflessione: noteRiflessione.trim(), 
            concettiDaRivedere: concettiDaRivedere.trim().split('\n').filter(c => c), 
            completatoAt: new Date().toISOString(), 
          }, 
          reciteCompletato: true, 
          faseCorrente: 'review', 
        }), 
      }); 
      if (!res.ok) throw new Error('Errore completamento'); 
      return res.json(); 
    }, 
    onSuccess: () => { 
      toast({ title: '✅ Fase Recite completata!' }); 
      queryClient.invalidateQueries({ queryKey: ['sq3r-capitolo', capitolo.id] }); 
      onComplete(); 
    }, 
  }); 

  const handleCompleta = () => { 
    if (valutazione === 0) { 
      toast({ title: '⚠️ Inserisci una valutazione', variant: 'destructive' }); 
      return; 
    } 
    if (!noteRiflessione.trim()) { 
      toast({ title: '⚠️ Scrivi almeno una riflessione', variant: 'destructive' }); 
      return; 
    } 
    completaMutation.mutate(); 
  }; 

  const formatTime = (seconds: number) => { 
    const mins = Math.floor(seconds / 60); 
    const secs = seconds % 60; 
    return `${mins}:${secs.toString().padStart(2, '0')}`; 
  }; 

  return ( 
    <div className="space-y-6"> 
      {/* Timer Exposure */} 
      <Card> 
        <CardHeader> 
          <CardTitle>⏱️ Timer Recite</CardTitle> 
        </CardHeader> 
        <CardContent> 
          <div className="text-center"> 
            <div className="text-6xl font-mono font-bold mb-4"> 
              {formatTime(timer)} 
            </div> 
            <div className="flex gap-2 justify-center"> 
              <Button onClick={() => setIsRunning(!isRunning)} size="lg"> 
                {isRunning ? <><Pause className="mr-2" /> Pausa</> : <><Play className="mr-2" /> Inizia</>} 
              </Button> 
              <Button variant="outline" onClick={() => { setTimer(0); setIsRunning(false); }}> 
                <RotateCcw className="mr-2" /> Reset 
              </Button> 
            </div> 
          </div> 
        </CardContent> 
      </Card> 

      {/* Auto-valutazione */} 
      <Card> 
        <CardHeader> 
          <CardTitle>📊 Auto-valutazione</CardTitle> 
        </CardHeader> 
        <CardContent> 
          <Label>Quanto bene hai compreso questo capitolo?</Label> 
          <div className="flex gap-2 mt-2"> 
            {[1, 2, 3, 4, 5].map(v => ( 
              <Button 
                key={v} 
                variant={valutazione === v ? 'default' : 'outline'} 
                onClick={() => setValutazione(v)} 
                className="flex-1" 
              > 
                {v} 
              </Button> 
            ))} 
          </div> 
          <div className="flex justify-between text-sm text-muted-foreground mt-2"> 
            <span>Scarso</span> 
            <span>Ottimo</span> 
          </div> 
        </CardContent> 
      </Card> 

      {/* Note Riflessione */} 
      <Card> 
        <CardHeader> 
          <CardTitle>📝 Note di riflessione</CardTitle> 
        </CardHeader> 
        <CardContent> 
          <Textarea 
            value={noteRiflessione} 
            onChange={e => setNoteRiflessione(e.target.value)} 
            onBlur={handleBlur} 
            placeholder="Riassumi con parole tue i concetti chiave..." 
            rows={6} 
          /> 
        </CardContent> 
      </Card> 

      {/* Concetti da rivedere */} 
      <Card> 
        <CardHeader> 
          <CardTitle>🔄 Concetti da rivedere</CardTitle> 
        </CardHeader> 
        <CardContent> 
          <Textarea 
            value={concettiDaRivedere} 
            onChange={e => setConcettiDaRivedere(e.target.value)} 
            onBlur={handleBlur} 
            placeholder="Uno per riga..." 
            rows={4} 
          /> 
        </CardContent> 
      </Card> 

      {/* Stato salvataggio */} 
      {ultimoSalvataggio && ( 
        <Badge variant="secondary"> 
          💾 Ultimo salvataggio: {ultimoSalvataggio.toLocaleTimeString()} 
        </Badge> 
      )} 

      {/* Azioni */} 
      <div className="flex gap-2 justify-end"> 
        <Button variant="outline" onClick={handleSalvaProgressi}> 
          <Save className="mr-2" /> Salva Progressi 
        </Button> 
        <Button size="lg" onClick={handleCompleta} disabled={completaMutation.isPending}> 
          {completaMutation.isPending ? '⏳ Completamento...' : '✅ Completa Recite'} 
        </Button> 
      </div> 
    </div> 
  ); 
}