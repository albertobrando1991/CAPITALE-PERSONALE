import { useState, useEffect, useRef } from 'react'; 
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label'; 
import { Badge } from '@/components/ui/badge'; 
import { Play, Pause, RotateCcw, Save, Mic, Square, Download, Trash2 } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast'; 

interface RecitePhaseProps { 
  capitolo: any; 
  onComplete: () => void; 
} 

export default function RecitePhase({ capitolo, onComplete }: RecitePhaseProps) { 
  const { toast } = useToast(); 
  const queryClient = useQueryClient(); 
  
  // Stato base 
  const [timer, setTimer] = useState(capitolo.reciteData?.tempoSecondi || 0); 
  const [isRunning, setIsRunning] = useState(false); 
  const [valutazione, setValutazione] = useState(capitolo.reciteData?.valutazione || 0); 
  const [noteRiflessione, setNoteRiflessione] = useState(capitolo.reciteData?.noteRiflessione || ''); 
  const [concettiDaRivedere, setConcettiDaRivedere] = useState(capitolo.reciteData?.concettiDaRivedere?.join('\n') || ''); 
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState<Date | null>(null); 
  
  // Stato registrazione audio 
  const [isRecording, setIsRecording] = useState(false); 
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null); 
  const [audioUrl, setAudioUrl] = useState<string | null>(null); 
  const [isPlaying, setIsPlaying] = useState(false); 
  const [recordingTime, setRecordingTime] = useState(0); 
  
  // Refs 
  const intervalRef = useRef<NodeJS.Timeout>(); 
  const autoSaveRef = useRef<NodeJS.Timeout>(); 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); 
  const audioChunksRef = useRef<Blob[]>([]); 
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null); 
  const recordingTimerRef = useRef<NodeJS.Timeout>(); 

  // Timer principale 
  useEffect(() => { 
    if (isRunning) { 
      intervalRef.current = setInterval(() => { 
        setTimer(t => t + 1); 
      }, 1000); 
    } 
    return () => clearInterval(intervalRef.current); 
  }, [isRunning]); 

  // Timer registrazione 
  useEffect(() => { 
    if (isRecording) { 
      recordingTimerRef.current = setInterval(() => { 
        setRecordingTime(t => t + 1); 
      }, 1000); 
    } else { 
      clearInterval(recordingTimerRef.current); 
    } 
    return () => clearInterval(recordingTimerRef.current); 
  }, [isRecording]); 

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
      }, 10000); 
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

  // ============================================ 
  // AUDIO RECORDING FUNCTIONS 
  // ============================================ 

  const startRecording = async () => { 
    try { 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
      
      // Crea MediaRecorder 
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      }); 
      
      mediaRecorderRef.current = mediaRecorder; 
      audioChunksRef.current = []; 

      mediaRecorder.ondataavailable = (event) => { 
        if (event.data.size > 0) { 
          audioChunksRef.current.push(event.data); 
        } 
      }; 

      mediaRecorder.onstop = () => { 
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        setAudioBlob(audioBlob); 
        
        // Crea URL per playback 
        const url = URL.createObjectURL(audioBlob); 
        setAudioUrl(url); 
        
        // Stop tutti i tracks 
        stream.getTracks().forEach(track => track.stop()); 
        
        toast({ 
          title: "✅ Registrazione completata", 
          description: `Durata: ${formatTime(recordingTime)}`, 
        }); 
      }; 

      mediaRecorder.start(); 
      setIsRecording(true); 
      setRecordingTime(0); 
      
      toast({ 
        title: "🎙️ Registrazione iniziata", 
        description: "Inizia a parlare del capitolo...", 
      }); 
    } catch (error) { 
      console.error('Errore accesso microfono:', error); 
      toast({ 
        title: "❌ Errore microfono", 
        description: "Impossibile accedere al microfono. Verifica i permessi del browser.", 
        variant: "destructive", 
      }); 
    } 
  }; 

  const stopRecording = () => { 
    if (mediaRecorderRef.current && isRecording) { 
      mediaRecorderRef.current.stop(); 
      setIsRecording(false); 
    } 
  }; 

  const playAudio = () => { 
    if (!audioUrl) return; 
    
    if (audioPlayerRef.current) { 
      audioPlayerRef.current.pause(); 
      audioPlayerRef.current = null; 
    } 
    
    const audio = new Audio(audioUrl); 
    audioPlayerRef.current = audio; 
    
    audio.onended = () => { 
      setIsPlaying(false); 
    }; 
    
    audio.play(); 
    setIsPlaying(true); 
  }; 

  const pauseAudio = () => { 
    if (audioPlayerRef.current) { 
      audioPlayerRef.current.pause(); 
      setIsPlaying(false); 
    } 
  }; 

  const downloadAudio = () => { 
    if (!audioBlob) return; 
    
    // Converti webm a formato più compatibile (opzionale) 
    const url = URL.createObjectURL(audioBlob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `recite-${capitolo.titolo}-${new Date().getTime()}.webm`; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url); 
    
    toast({ 
      title: "💾 Audio scaricato", 
      description: "Il file è stato salvato sul tuo dispositivo", 
    }); 
  }; 

  const deleteAudio = () => { 
    if (confirm('Eliminare la registrazione corrente?')) { 
      if (audioPlayerRef.current) { 
        audioPlayerRef.current.pause(); 
        audioPlayerRef.current = null; 
      } 
      
      if (audioUrl) { 
        URL.revokeObjectURL(audioUrl); 
      } 
      
      setAudioBlob(null); 
      setAudioUrl(null); 
      setIsPlaying(false); 
      setRecordingTime(0); 
      
      toast({ 
        title: "🗑️ Registrazione eliminata", 
      }); 
    } 
  }; 

  // Cleanup 
  useEffect(() => { 
    return () => { 
      if (audioPlayerRef.current) { 
        audioPlayerRef.current.pause(); 
      } 
      if (audioUrl) { 
        URL.revokeObjectURL(audioUrl); 
      } 
    }; 
  }, [audioUrl]); 

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
            hasAudioRecording: !!audioBlob, 
            recordingDuration: recordingTime, 
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
    if (!noteRiflessione.trim() && !audioBlob) { 
      toast({ 
        title: '⚠️ Aggiungi contenuto', 
        description: 'Scrivi una riflessione o registra un audio', 
        variant: 'destructive' 
      }); 
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

      {/* NUOVO: Registrazione Audio */} 
      <Card className="border-2 border-purple-200 bg-purple-50/50"> 
        <CardHeader> 
          <CardTitle className="flex items-center gap-2"> 
            🎙️ Registrazione Audio 
            <Badge variant="secondary">Opzionale</Badge> 
          </CardTitle> 
        </CardHeader> 
        <CardContent className="space-y-4"> 
          <p className="text-sm text-gray-600"> 
            Registra te stesso mentre reciti il capitolo ad alta voce. Potrai riascoltarti e scaricare l'audio. 
          </p> 
          
          {/* Stato: Nessuna Registrazione */} 
          {!isRecording && !audioBlob && ( 
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="w-full bg-red-500 hover:bg-red-600" 
            > 
              <Mic className="mr-2 w-5 h-5" /> 
              Inizia Registrazione 
            </Button> 
          )} 
          
          {/* Stato: Registrazione in Corso */} 
          {isRecording && ( 
            <div className="space-y-3"> 
              <div className="flex items-center justify-center gap-3"> 
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div> 
                <span className="text-2xl font-mono font-bold text-red-600"> 
                  {formatTime(recordingTime)} 
                </span> 
              </div> 
              <Button 
                onClick={stopRecording} 
                size="lg" 
                variant="outline" 
                className="w-full border-red-500 text-red-600 hover:bg-red-50" 
              > 
                <Square className="mr-2 w-5 h-5" /> 
                Ferma Registrazione 
              </Button> 
            </div> 
          )} 
          
          {/* Stato: Registrazione Completata */} 
          {!isRecording && audioBlob && ( 
            <div className="space-y-3"> 
              <div className="bg-green-50 border border-green-200 rounded-lg p-4"> 
                <div className="flex items-center justify-between mb-3"> 
                  <div className="flex items-center gap-2"> 
                    <Badge className="bg-green-500">✓ Registrato</Badge> 
                    <span className="text-sm text-gray-600"> 
                      Durata: {formatTime(recordingTime)} 
                    </span> 
                  </div> 
                </div> 
                
                <div className="flex gap-2"> 
                  <Button 
                    onClick={isPlaying ? pauseAudio : playAudio} 
                    className="flex-1" 
                  > 
                    {isPlaying ? ( 
                      <><Pause className="mr-2" /> Pausa</> 
                    ) : ( 
                      <><Play className="mr-2" /> Ascolta</> 
                    )} 
                  </Button> 
                  
                  <Button 
                    onClick={downloadAudio} 
                    variant="outline" 
                    title="Scarica audio" 
                  > 
                    <Download className="w-4 h-4" /> 
                  </Button> 
                  
                  <Button 
                    onClick={deleteAudio} 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50" 
                    title="Elimina e registra di nuovo" 
                  > 
                    <Trash2 className="w-4 h-4" /> 
                  </Button> 
                </div> 
              </div> 
              
              <Button 
                onClick={() => { 
                  deleteAudio(); 
                  setTimeout(startRecording, 300); 
                }} 
                variant="outline" 
                className="w-full" 
              > 
                <Mic className="mr-2" /> 
                Registra di Nuovo 
              </Button> 
            </div> 
          )} 
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