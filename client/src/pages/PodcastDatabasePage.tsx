import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Clock, Headphones, Lock, Crown, Search, ArrowLeft, MessageSquarePlus } from 'lucide-react';

const MATERIE = [
  'Tutte le materie',
  'Diritto Amministrativo',
  'Diritto Costituzionale',
  'Diritto Civile',
  'Contabilità Pubblica',
  'Diritto del Lavoro',
  'Economia Aziendale',
  'Informatica',
  'Lingua Inglese',
];

interface Podcast {
  id: string;
  titolo: string;
  descrizione: string;
  materia: string;
  argomento: string;
  audioFileName: string;
  audioFileSize: number;
  durata: number;
  ascoltiTotali: number;
  isPremiumOnly: boolean;
  locked: boolean;
  createdAt: string;
  audioUrl?: string;
}

export default function PodcastDatabasePage() {
  const { concorsoId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [materiaFiltro, setMateriaFiltro] = useState('Tutte le materie');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Richiesta custom dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    materia: '',
    argomento: '',
    descrizione: '',
  });

  // Fetch podcast
  const { data: podcasts, isLoading } = useQuery({
    queryKey: ['podcast', materiaFiltro],
    queryFn: async () => {
      const materiaParam = materiaFiltro === 'Tutte le materie' ? '' : materiaFiltro;
      const res = await fetch(`/api/podcast?materia=${materiaParam}`);
      if (!res.ok) throw new Error('Errore caricamento podcast');
      return res.json();
    },
  });

  // Fetch dettaglio podcast con audio
  const fetchPodcastMutation = useMutation({
    mutationFn: async (podcastId: string) => {
      const res = await fetch(`/api/podcast/${podcastId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore caricamento podcast');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentPodcast(data);
      if (data.audioUrl) {
        playPodcast(data.audioUrl);
      }
    },
    onError: (error: any) => {
      if (error.message.includes('Premium')) {
        toast({
          title: '🔒 Premium Richiesto',
          description: 'Questo podcast è disponibile solo per utenti Premium',
          action: (
            <Button size="sm" onClick={() => setLocation(`/concorsi/${concorsoId}/premium`)}>
              Passa a Premium
            </Button>
          ),
        });
      } else {
        toast({ title: '❌ Errore', description: error.message, variant: 'destructive' });
      }
    },
  });

  // Richiesta podcast custom
  const requestPodcastMutation = useMutation({
    mutationFn: async (data: typeof requestForm) => {
      const res = await fetch('/api/podcast/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, concorsoId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '✅ Richiesta inviata!', description: 'Ti contatteremo entro 3-5 giorni' });
      setRequestDialogOpen(false);
      setRequestForm({ materia: '', argomento: '', descrizione: '' });
    },
    onError: (error: any) => {
      if (error.message.includes('Premium')) {
        toast({
          title: '🔒 Premium Richiesto',
          description: 'Le richieste custom sono disponibili solo per utenti Premium',
        });
      } else {
        toast({ title: '❌ Errore', description: error.message, variant: 'destructive' });
      }
    },
  });

  const playPodcast = (audioUrl: string) => {
    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    audio.play();
    setAudioElement(audio);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const podcastsFiltrati = podcasts?.filter((p: Podcast) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.titolo.toLowerCase().includes(query) ||
      p.argomento.toLowerCase().includes(query) ||
      p.descrizione.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/concorsi/${concorsoId}/setup-fonti`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Torna a Setup Fonti
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎧 Banca Dati Podcast</h1>
            <p className="text-lg text-muted-foreground">
              Ascolta lezioni audio create da esperti
            </p>
          </div>

          {/* Richiesta Custom */}
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600">
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Richiedi Podcast Custom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>🎙️ Richiedi un Podcast Personalizzato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Materia</Label>
                  <Select value={requestForm.materia} onValueChange={(v) => setRequestForm({ ...requestForm, materia: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli materia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIE.filter(m => m !== 'Tutte le materie').map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Argomento</Label>
                  <Input 
                    placeholder="es. Procedimento amministrativo" 
                    value={requestForm.argomento} 
                    onChange={(e) => setRequestForm({ ...requestForm, argomento: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>Descrizione (opzionale)</Label>
                  <Textarea 
                    placeholder="Dettagli aggiuntivi su cosa vorresti approfondire..." 
                    value={requestForm.descrizione} 
                    onChange={(e) => setRequestForm({ ...requestForm, descrizione: e.target.value })} 
                    rows={3} 
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => requestPodcastMutation.mutate(requestForm)} 
                  disabled={!requestForm.materia || !requestForm.argomento || requestPodcastMutation.isPending}
                >
                  {requestPodcastMutation.isPending ? 'Invio...' : 'Invia Richiesta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtri */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Filtra per materia</label>
          <Select value={materiaFiltro} onValueChange={setMateriaFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIE.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Cerca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cerca per titolo o argomento..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </div>
      </div>

      {/* Player Fisso (se podcast in riproduzione) */}
      {currentPodcast && (
        <Card className="mb-6 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Button 
                size="lg" 
                className="rounded-full w-12 h-12 p-0" 
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <div className="flex-1">
                <h4 className="font-semibold">{currentPodcast.titolo}</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${(currentTime / duration) * 100}%` }} 
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento podcast...</p>
        </div>
      )}

      {/* Griglia Podcast */}
      <div className="grid md:grid-cols-2 gap-4">
        {podcastsFiltrati.map((podcast: Podcast) => (
          <Card key={podcast.id} className={`hover:shadow-md transition-shadow ${podcast.locked ? 'opacity-75' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2 flex items-center gap-2">
                    {podcast.titolo}
                    {podcast.locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {podcast.descrizione}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary">{podcast.materia}</Badge>
                <Badge variant="outline">{podcast.argomento}</Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(podcast.durata / 60)} min
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  {podcast.ascoltiTotali} ascolti
                </Badge>
              </div>

              {podcast.locked ? (
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={() => setLocation(`/concorsi/${concorsoId}/premium`)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Sblocca con Premium
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => fetchPodcastMutation.mutate(podcast.id)} 
                  disabled={fetchPodcastMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {currentPodcast?.id === podcast.id && isPlaying ? 'In Riproduzione' : 'Ascolta'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && podcastsFiltrati.length === 0 && (
        <div className="text-center py-12">
          <Headphones className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            Nessun podcast trovato per questa ricerca
          </p>
        </div>
      )}
    </div>
  );
}
