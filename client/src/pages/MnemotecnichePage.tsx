import { useState } from 'react'; 
import { ArrowLeft, Lightbulb, Hash, Home, Film, Plus, Trash2 } from 'lucide-react'; 
import { Button } from '@/components/ui/button'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; 
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; 
import { Textarea } from '@/components/ui/textarea'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { Badge } from '@/components/ui/badge'; 
import { useLocation } from 'wouter'; 
import { useToast } from '@/hooks/use-toast'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Mapping fonetico Leibniz 
const PHONETIC_MAP: Record<string, string> = { 
  '0': 'S/Z', 
  '1': 'T/D', 
  '2': 'N', 
  '3': 'M', 
  '4': 'R', 
  '5': 'L', 
  '6': 'C/G', 
  '7': 'K/Q', 
  '8': 'F/V', 
  '9': 'P/B' 
}; 

// Suggerimenti parole preconfigurati 
const WORD_SUGGESTIONS: Record<string, string[]> = { 
  '328': ['MaNiaCo', 'MoNaFa', 'MiNiFa'], 
  '624': ['GeNeRo', 'CiNeMa', 'GioRNo'], 
  '241': ['NaRDo', 'NeReTa', 'NoRDo'], 
  '90': ['BuS', 'PaSo', 'BaSe'] 
}; 

interface Stanza { 
  id: string; 
  nome: string; 
  articolo: string; 
  immagine: string; 
} 

interface FilmMentale { 
  titolo: string; 
  articolo: string; 
  setting: string; 
  soggettoAttivo: string; 
  condotta: string; 
  evento: string; 
  nessoCausale: string; 
  elementoPsicologico: string; 
} 

export default function MnemotecnichePage() { 
  const [, navigate] = useLocation(); 
  const { toast } = useToast(); 
  const queryClient = useQueryClient();

  // 📥 FETCH DATI
  const { data: mnemonicheNumeri } = useQuery({
    queryKey: ['mnemoniche-numeri'],
    queryFn: async () => {
      const res = await fetch('/api/mnemotecniche/numeri');
      if (!res.ok) throw new Error('Errore caricamento mnemoniche');
      return res.json();
    }
  });

  const { data: palazziMemoria } = useQuery({
    queryKey: ['palazzi-memoria'],
    queryFn: async () => {
      const res = await fetch('/api/mnemotecniche/palazzi');
      if (!res.ok) throw new Error('Errore caricamento palazzi');
      return res.json();
    }
  });

  const { data: filmMentali } = useQuery({
    queryKey: ['film-mentali'],
    queryFn: async () => {
      const res = await fetch('/api/mnemotecniche/film');
      if (!res.ok) throw new Error('Errore caricamento film');
      return res.json();
    }
  });

  // 🗑️ DELETE MUTATIONS
  const deleteMnemonicaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/mnemotecniche/numeri/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore cancellazione');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mnemoniche-numeri'] });
      toast({ title: "Cancellato", description: "Mnemonica eliminata con successo" });
    }
  });

  const deletePalazzoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/mnemotecniche/palazzi/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore cancellazione');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['palazzi-memoria'] });
      toast({ title: "Cancellato", description: "Palazzo eliminato con successo" });
    }
  });

  const deleteFilmMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/mnemotecniche/film/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore cancellazione');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['film-mentali'] });
      toast({ title: "Cancellato", description: "Film eliminato con successo" });
    }
  });

  // 🔢 CONVERTITORE NUMERI 
  const [numeroArticolo, setNumeroArticolo] = useState(''); 
  const [codiceFonetico, setCodiceFonetico] = useState(''); 
  const [paroleSuggerite, setParoleSuggerite] = useState<string[]>([]); 
  const [parolaScelta, setParolaScelta] = useState(''); 

  const convertiNumero = () => { 
    if (!numeroArticolo) { 
      toast({ 
        title: "Errore", 
        description: "Inserisci un numero di articolo", 
        variant: "destructive" 
      }); 
      return; 
    } 

    const codice = numeroArticolo 
      .split('') 
      .map(digit => PHONETIC_MAP[digit] || '') 
      .join('-'); 
    
    setCodiceFonetico(codice); 
    setParoleSuggerite(WORD_SUGGESTIONS[numeroArticolo] || []); 
  }; 

  // 🔢 SALVA MNEMONICA NUMERICA 
  const salvaMnemonicaMutation = useMutation({ 
    mutationFn: async (data: { 
      numeroArticolo: string; 
      codiceFonetico: string; 
      parolaMnemonica: string; 
    }) => { 
      const res = await fetch('/api/mnemotecniche/numeri', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include', 
        body: JSON.stringify({ 
          numeroArticolo: data.numeroArticolo, 
          codiceFonetico: data.codiceFonetico, 
          parolaMnemonica: data.parolaMnemonica 
        }) 
      }); 

      if (!res.ok) { 
        let errorMessage = 'Errore nel salvataggio';
        try {
          const error = await res.json(); 
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use default error message or status text
          errorMessage = res.statusText || errorMessage;
          console.error("Non-JSON error response:", e);
        }
        throw new Error(errorMessage); 
      } 

      return res.json(); 
    }, 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['mnemoniche-numeri'] }); 
      toast({ 
        title: "✅ Mnemonica Salvata!", 
        description: `Art. ${numeroArticolo} → ${parolaScelta}` 
      }); 

      // Reset 
      setNumeroArticolo(''); 
      setCodiceFonetico(''); 
      setParoleSuggerite([]); 
      setParolaScelta(''); 
    }, 
    onError: (error: Error) => { 
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      }); 
    } 
  }); 

  const salvaMnemonica = () => { 
    if (!parolaScelta) { 
      toast({ 
        title: "Attenzione", 
        description: "Inserisci o scegli una parola mnemonica", 
        variant: "destructive" 
      }); 
      return; 
    } 

    salvaMnemonicaMutation.mutate({ 
      numeroArticolo, 
      codiceFonetico, 
      parolaMnemonica: parolaScelta 
    }); 
  }; 

  // 🏛️ PALAZZO DELLA MEMORIA 
  const [nomePalazzo, setNomePalazzo] = useState(''); 
  const [stanze, setStanze] = useState<Stanza[]>([]); 
  const [nuovaStanza, setNuovaStanza] = useState({ 
    nome: '', 
    articolo: '', 
    immagine: '' 
  }); 

  const aggiungiStanza = () => { 
    if (!nuovaStanza.nome || !nuovaStanza.articolo || !nuovaStanza.immagine) { 
      toast({ 
        title: "Campi mancanti", 
        description: "Compila tutti i campi della stanza", 
        variant: "destructive" 
      }); 
      return; 
    } 

    setStanze([...stanze, { 
      id: Date.now().toString(), 
      ...nuovaStanza 
    }]); 

    setNuovaStanza({ nome: '', articolo: '', immagine: '' }); 
    
    toast({ 
      title: "Stanza Aggiunta!", 
      description: `${nuovaStanza.nome} è stata aggiunta al palazzo` 
    }); 
  }; 

  const rimuoviStanza = (id: string) => { 
    setStanze(stanze.filter(s => s.id !== id)); 
  }; 

  // 🏛️ SALVA PALAZZO 
  const salvaPalazzoMutation = useMutation({ 
    mutationFn: async (data: { 
      nomePalazzo: string; 
      stanze: Array<{ nome: string; articolo: string; immagine: string }>; 
    }) => { 
      const res = await fetch('/api/mnemotecniche/palazzi', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include', 
        body: JSON.stringify({ 
          nomePalazzo: data.nomePalazzo, 
          stanze: data.stanze 
        }) 
      }); 

      if (!res.ok) { 
        let errorMessage = 'Errore nel salvataggio';
        try {
          const error = await res.json(); 
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
          console.error("Non-JSON error response:", e);
        }
        throw new Error(errorMessage); 
      } 

      return res.json(); 
    }, 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['palazzi-memoria'] }); 
      toast({ 
        title: "🏛️ Palazzo Salvato!", 
        description: `"${nomePalazzo}" con ${stanze.length} stanze` 
      }); 

      // Reset 
      setNomePalazzo(''); 
      setStanze([]); 
    }, 
    onError: (error: Error) => { 
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      }); 
    } 
  }); 

  const salvaPalazzo = () => { 
    if (!nomePalazzo || stanze.length === 0) { 
      toast({ 
        title: "Palazzo Incompleto", 
        description: "Dai un nome al palazzo e aggiungi almeno una stanza", 
        variant: "destructive" 
      }); 
      return; 
    } 

    salvaPalazzoMutation.mutate({ 
      nomePalazzo, 
      stanze 
    }); 
  }; 

  // 🎬 FILM MENTALE 
  const [film, setFilm] = useState<FilmMentale>({ 
    titolo: '', 
    articolo: '', 
    setting: '', 
    soggettoAttivo: '', 
    condotta: '', 
    evento: '', 
    nessoCausale: '', 
    elementoPsicologico: '' 
  }); 

  // 🎬 SALVA FILM MENTALE 
  const salvaFilmMutation = useMutation({ 
    mutationFn: async (data: FilmMentale) => { 
      const res = await fetch('/api/mnemotecniche/film', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include', 
        body: JSON.stringify({ 
          titolo: data.titolo, 
          articolo: data.articolo, 
          setting: data.setting, 
          soggettoAttivo: data.soggettoAttivo, 
          condotta: data.condotta, 
          evento: data.evento, 
          nessoCausale: data.nessoCausale, 
          elementoPsicologico: data.elementoPsicologico 
        }) 
      }); 

      if (!res.ok) { 
        let errorMessage = 'Errore nel salvataggio';
        try {
          const error = await res.json(); 
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
          console.error("Non-JSON error response:", e);
        }
        throw new Error(errorMessage); 
      } 

      return res.json(); 
    }, 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['film-mentali'] }); 
      toast({ 
        title: "🎬 Film Salvato!", 
        description: `"${film.titolo}" - Art. ${film.articolo}` 
      }); 

      // Reset 
      setFilm({ 
        titolo: '', 
        articolo: '', 
        setting: '', 
        soggettoAttivo: '', 
        condotta: '', 
        evento: '', 
        nessoCausale: '', 
        elementoPsicologico: '' 
      }); 
    }, 
    onError: (error: Error) => { 
      toast({ 
        title: "Errore", 
        description: error.message, 
        variant: "destructive" 
      }); 
    } 
  }); 

  const salvaFilm = () => { 
    const campiObbligatori = ['titolo', 'articolo', 'soggettoAttivo', 'condotta', 'evento']; 
    const mancanti = campiObbligatori.filter(campo => !film[campo as keyof FilmMentale]); 

    if (mancanti.length > 0) { 
      toast({ 
        title: "Campi Obbligatori Mancanti", 
        description: "Compila almeno: Titolo, Articolo, Soggetto, Condotta, Evento", 
        variant: "destructive" 
      }); 
      return; 
    } 

    salvaFilmMutation.mutate(film); 
  }; 

  return ( 
    <div className="container mx-auto p-6 max-w-7xl"> 
      {/* Header */} 
      <div className="flex items-center justify-between mb-6"> 
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="gap-2" 
        > 
          <ArrowLeft className="h-4 w-4" /> 
          Torna alla Dashboard 
        </Button> 
        <Button 
          variant="outline" 
          onClick={() => navigate('/libreria')} 
          className="gap-2" 
        > 
          <Lightbulb className="h-4 w-4" /> 
          Guida Teorica 
        </Button> 
      </div> 

      {/* Titolo Pagina */} 
      <div className="mb-8"> 
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2"> 
          <Lightbulb className="h-8 w-8 text-purple-600" /> 
          Tool Mnemotecniche Interattivi 
        </h1> 
        <p className="text-muted-foreground"> 
          Crea le tue mnemotecniche personalizzate per memorizzare articoli, codici e concetti giuridici 
        </p> 
      </div> 

      {/* Tabs dei Tool */} 
      <Tabs defaultValue="convertitore" className="w-full"> 
        <TabsList className="grid w-full grid-cols-3"> 
          <TabsTrigger value="convertitore" className="gap-2"> 
            <Hash className="h-4 w-4" /> 
            Convertitore Numeri 
          </TabsTrigger> 
          <TabsTrigger value="palazzo" className="gap-2"> 
            <Home className="h-4 w-4" /> 
            Palazzo Memoria 
          </TabsTrigger> 
          <TabsTrigger value="film" className="gap-2"> 
            <Film className="h-4 w-4" /> 
            Film Mentale 
          </TabsTrigger> 
        </TabsList> 

        {/* 🔢 TAB 1: CONVERTITORE NUMERI */} 
        <TabsContent value="convertitore" className="space-y-6"> 
          <Card> 
            <CardHeader> 
              <CardTitle className="flex items-center gap-2"> 
                <Hash className="h-5 w-5 text-blue-600" /> 
                Convertitore Numeri → Parole (Sistema Leibniz) 
              </CardTitle> 
              <CardDescription> 
                Trasforma il numero di un articolo in una parola memorabile usando la conversione fonetica 
              </CardDescription> 
            </CardHeader> 
            <CardContent className="space-y-4"> 
              {/* Input Numero */} 
              <div className="space-y-2"> 
                <Label htmlFor="numeroArticolo">Numero Articolo</Label> 
                <Input 
                  id="numeroArticolo" 
                  type="text" 
                  placeholder="es. 328" 
                  value={numeroArticolo} 
                  onChange={(e) => setNumeroArticolo(e.target.value)} 
                  maxLength={4} 
                /> 
              </div> 

              <Button onClick={convertiNumero} className="w-full"> 
                Converti in Codice Fonetico 
              </Button> 

              {/* Risultato Conversione */} 
              {codiceFonetico && ( 
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200"> 
                  <div> 
                    <Label className="text-blue-900">Codice Fonetico</Label> 
                    <div className="text-2xl font-bold text-blue-600 mt-1"> 
                      {codiceFonetico} 
                    </div> 
                  </div> 

                  {/* Parole Suggerite */} 
                  {paroleSuggerite.length > 0 && ( 
                    <div> 
                      <Label className="text-blue-900">Parole Suggerite</Label> 
                      <div className="flex flex-wrap gap-2 mt-2"> 
                        {paroleSuggerite.map((parola) => ( 
                          <Badge 
                            key={parola} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-blue-100" 
                            onClick={() => setParolaScelta(parola)} 
                          > 
                            {parola} 
                          </Badge> 
                        ))} 
                      </div> 
                    </div> 
                  )} 

                  {/* Input Parola Personalizzata */} 
                  <div className="space-y-2"> 
                    <Label htmlFor="parolaScelta">La Tua Parola Mnemonica</Label> 
                    <Input 
                      id="parolaScelta" 
                      placeholder="es. MaNiaCo" 
                      value={parolaScelta} 
                      onChange={(e) => setParolaScelta(e.target.value)} 
                    /> 
                  </div> 

                  <Button onClick={salvaMnemonica} className="w-full bg-blue-600 hover:bg-blue-700"> 
                    💾 Salva Mnemonica 
                  </Button> 
                </div> 
              )} 

              {/* Tabella Riferimento */} 
              <div className="mt-6"> 
                <Label className="mb-2 block">Tabella di Conversione Fonetica</Label> 
                <div className="grid grid-cols-5 gap-2 text-sm"> 
                  {Object.entries(PHONETIC_MAP).map(([num, sound]) => ( 
                    <div key={num} className="p-2 bg-gray-100 rounded text-center"> 
                      <div className="font-bold">{num}</div> 
                      <div className="text-xs text-muted-foreground">{sound}</div> 
                    </div> 
                  ))} 
                </div> 
              </div> 

              {/* LISTA MNEMONICHE SALVATE */}
              <div className="mt-8 border-t pt-6">
                <Label className="text-lg font-bold mb-4 block flex items-center gap-2">
                  <Hash className="h-5 w-5" /> 
                  Le Tue Mnemoniche Salvate
                </Label>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {mnemonicheNumeri?.map((m: any) => (
                    <Card key={m.id} className="p-4 relative hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-xl text-blue-700">Art. {m.numeroArticolo}</div>
                          <div className="text-sm font-mono bg-blue-50 px-2 py-1 rounded inline-block mt-1">
                            {m.codiceFonetico}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => deleteMnemonicaMutation.mutate(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-bold">{m.parolaMnemonica}</div>
                        {m.contesto && (
                          <div className="text-sm text-muted-foreground mt-1 italic">
                            "{m.contesto}"
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {mnemonicheNumeri?.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8 bg-gray-50 rounded-lg border border-dashed">
                      Nessuna mnemonica salvata ancora. Converti un numero e salvalo!
                    </div>
                  )}
                </div>
              </div>
            </CardContent> 
          </Card> 
        </TabsContent> 

        {/* 🏛️ TAB 2: PALAZZO MEMORIA */} 
        <TabsContent value="palazzo" className="space-y-6"> 
          <Card> 
            <CardHeader> 
              <CardTitle className="flex items-center gap-2"> 
                <Home className="h-5 w-5 text-purple-600" /> 
                Costruisci il Tuo Palazzo della Memoria 
              </CardTitle> 
              <CardDescription> 
                Associa articoli di legge a stanze di un luogo immaginario 
              </CardDescription> 
            </CardHeader> 
            <CardContent className="space-y-4"> 
              {/* Nome Palazzo */} 
              <div className="space-y-2"> 
                <Label htmlFor="nomePalazzo">Nome del Palazzo</Label> 
                <Input 
                  id="nomePalazzo" 
                  placeholder="es. La Mia Casa, Palazzo Giustizia..." 
                  value={nomePalazzo} 
                  onChange={(e) => setNomePalazzo(e.target.value)} 
                /> 
              </div> 

              {/* Aggiungi Stanza */} 
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200"> 
                <Label className="text-purple-900 font-semibold">Aggiungi Nuova Stanza</Label> 
                
                <div className="grid md:grid-cols-3 gap-3"> 
                  <div className="space-y-2"> 
                    <Label htmlFor="nomeStanza">Nome Stanza</Label> 
                    <Input 
                      id="nomeStanza" 
                      placeholder="es. Ingresso" 
                      value={nuovaStanza.nome} 
                      onChange={(e) => setNuovaStanza({...nuovaStanza, nome: e.target.value})} 
                    /> 
                  </div> 

                  <div className="space-y-2"> 
                    <Label htmlFor="articoloStanza">Articolo</Label> 
                    <Input 
                      id="articoloStanza" 
                      placeholder="es. Art. 1" 
                      value={nuovaStanza.articolo} 
                      onChange={(e) => setNuovaStanza({...nuovaStanza, articolo: e.target.value})} 
                    /> 
                  </div> 

                  <div className="space-y-2"> 
                    <Label htmlFor="immagineStanza">Immagine Vivida</Label> 
                    <Input 
                      id="immagineStanza" 
                      placeholder="es. Vigile che dà il benvenuto" 
                      value={nuovaStanza.immagine} 
                      onChange={(e) => setNuovaStanza({...nuovaStanza, immagine: e.target.value})} 
                    /> 
                  </div> 
                </div> 

                <Button onClick={aggiungiStanza} className="w-full" variant="outline"> 
                  <Plus className="h-4 w-4 mr-2" /> 
                  Aggiungi Stanza 
                </Button> 
              </div> 

              {/* Lista Stanze */} 
              {stanze.length > 0 && ( 
                <div className="space-y-3"> 
                  <Label className="font-semibold">Stanze del Palazzo ({stanze.length})</Label> 
                  <div className="space-y-2"> 
                    {stanze.map((stanza, index) => ( 
                      <div 
                        key={stanza.id} 
                        className="flex items-center gap-3 p-3 bg-white border rounded-lg" 
                      > 
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600"> 
                          {index + 1} 
                        </div> 
                        <div className="flex-1 min-w-0"> 
                          <div className="font-semibold">{stanza.nome}</div> 
                          <div className="text-sm text-muted-foreground"> 
                            {stanza.articolo}: {stanza.immagine} 
                          </div> 
                        </div> 
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => rimuoviStanza(stanza.id)} 
                        > 
                          <Trash2 className="h-4 w-4 text-red-500" /> 
                        </Button> 
                      </div> 
                    ))} 
                  </div> 

                  <Button onClick={salvaPalazzo} className="w-full bg-purple-600 hover:bg-purple-700"> 
                    🏛️ Salva Palazzo Completo 
                  </Button> 
                </div> 
              )} 

              {/* LISTA PALAZZI SALVATI */}
              <div className="mt-8 border-t pt-6">
                <Label className="text-lg font-bold mb-4 block flex items-center gap-2">
                  <Home className="h-5 w-5" /> 
                  I Tuoi Palazzi della Memoria
                </Label>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {palazziMemoria?.map((p: any) => (
                    <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow border-purple-100">
                      <div className="bg-purple-50 p-3 flex justify-between items-center border-b border-purple-100">
                        <div className="font-bold text-purple-900 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {p.nomePalazzo}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => deletePalazzoMutation.mutate(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="p-4">
                        {p.descrizione && (
                          <div className="text-sm text-muted-foreground mb-3 italic">
                            "{p.descrizione}"
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {p.stanze?.slice(0, 3).map((stanza: any, idx: number) => (
                            <div key={idx} className="text-sm flex gap-2">
                              <span className="font-mono text-purple-600 font-bold">{idx + 1}.</span>
                              <span className="font-medium">{stanza.nome}:</span>
                              <span className="text-muted-foreground truncate">{stanza.articolo}</span>
                            </div>
                          ))}
                          {p.stanze?.length > 3 && (
                            <div className="text-xs text-center text-muted-foreground pt-1">
                              ...e altre {p.stanze.length - 3} stanze
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {palazziMemoria?.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8 bg-gray-50 rounded-lg border border-dashed">
                      Non hai ancora costruito nessun Palazzo della Memoria. Inizia ora!
                    </div>
                  )}
                </div>
              </div>
            </CardContent> 
          </Card> 
        </TabsContent> 

        {/* 🎬 TAB 3: FILM MENTALE */} 
        <TabsContent value="film" className="space-y-6"> 
          <Card> 
            <CardHeader> 
              <CardTitle className="flex items-center gap-2"> 
                <Film className="h-5 w-5 text-orange-600" /> 
                Costruisci un Film Mentale 
              </CardTitle> 
              <CardDescription> 
                Visualizza reati e concetti giuridici come scene cinematografiche 
              </CardDescription> 
            </CardHeader> 
            <CardContent className="space-y-4"> 
              <div className="grid md:grid-cols-2 gap-4"> 
                {/* Titolo e Articolo */} 
                <div className="space-y-2"> 
                  <Label htmlFor="titoloFilm">Titolo del Film *</Label> 
                  <Input 
                    id="titoloFilm" 
                    placeholder="es. Il Ladro Notturno" 
                    value={film.titolo} 
                    onChange={(e) => setFilm({...film, titolo: e.target.value})} 
                  /> 
                </div> 

                <div className="space-y-2"> 
                  <Label htmlFor="articoloFilm">Articolo di Riferimento *</Label> 
                  <Input 
                    id="articoloFilm" 
                    placeholder="es. Art. 624 CP" 
                    value={film.articolo} 
                    onChange={(e) => setFilm({...film, articolo: e.target.value})} 
                  /> 
                </div> 

                {/* Setting */} 
                <div className="space-y-2 md:col-span-2"> 
                  <Label htmlFor="setting">Setting (Ambientazione)</Label> 
                  <Input 
                    id="setting" 
                    placeholder="es. Una villa di notte, al buio" 
                    value={film.setting} 
                    onChange={(e) => setFilm({...film, setting: e.target.value})} 
                  /> 
                </div> 

                {/* Soggetto Attivo */} 
                <div className="space-y-2"> 
                  <Label htmlFor="soggettoAttivo">Soggetto Attivo *</Label> 
                  <Input 
                    id="soggettoAttivo" 
                    placeholder="es. Un ladro con passamontagna" 
                    value={film.soggettoAttivo} 
                    onChange={(e) => setFilm({...film, soggettoAttivo: e.target.value})} 
                  /> 
                </div> 

                {/* Condotta */} 
                <div className="space-y-2"> 
                  <Label htmlFor="condotta">Condotta (Azione) *</Label> 
                  <Input 
                    id="condotta" 
                    placeholder="es. Entra dalla finestra e ruba" 
                    value={film.condotta} 
                    onChange={(e) => setFilm({...film, condotta: e.target.value})} 
                  /> 
                </div> 

                {/* Evento */} 
                <div className="space-y-2"> 
                  <Label htmlFor="evento">Evento (Risultato) *</Label> 
                  <Input 
                    id="evento" 
                    placeholder="es. L'orologio scompare" 
                    value={film.evento} 
                    onChange={(e) => setFilm({...film, evento: e.target.value})} 
                  /> 
                </div> 

                {/* Nesso Causale */} 
                <div className="space-y-2"> 
                  <Label htmlFor="nessoCausale">Nesso Causale</Label> 
                  <Input 
                    id="nessoCausale" 
                    placeholder="es. La perdita del possesso è causata dal furto" 
                    value={film.nessoCausale} 
                    onChange={(e) => setFilm({...film, nessoCausale: e.target.value})} 
                  /> 
                </div> 

                {/* Elemento Psicologico */} 
                <div className="space-y-2 md:col-span-2"> 
                  <Label htmlFor="elementoPsicologico">Elemento Psicologico (Dolo/Colpa)</Label> 
                  <Textarea 
                    id="elementoPsicologico" 
                    placeholder="es. Il ladro ha premeditato il furto (dolo intenzionale)" 
                    value={film.elementoPsicologico} 
                    onChange={(e) => setFilm({...film, elementoPsicologico: e.target.value})} 
                    rows={2} 
                  /> 
                </div> 
              </div> 

              {/* Anteprima Film */} 
              {film.titolo && film.soggettoAttivo && ( 
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200"> 
                  <Label className="text-orange-900 font-semibold mb-2 block"> 
                    🎬 Anteprima del Film 
                  </Label> 
                  <div className="text-sm space-y-1"> 
                    <p><strong>Titolo:</strong> "{film.titolo}"</p> 
                    <p><strong>Articolo:</strong> {film.articolo}</p> 
                    {film.setting && <p><strong>Setting:</strong> {film.setting}</p>} 
                    <p><strong>Protagonista:</strong> {film.soggettoAttivo}</p> 
                    {film.condotta && <p><strong>Azione:</strong> {film.condotta}</p>} 
                    {film.evento && <p><strong>Conseguenza:</strong> {film.evento}</p>} 
                  </div> 
                </div> 
              )} 

              <Button onClick={salvaFilm} className="w-full bg-orange-600 hover:bg-orange-700"> 
                🎬 Salva Film Mentale 
              </Button> 

              {/* LISTA FILM SALVATI */}
              <div className="mt-8 border-t pt-6">
                <Label className="text-lg font-bold mb-4 block flex items-center gap-2">
                  <Film className="h-5 w-5" /> 
                  I Tuoi Film Mentali
                </Label>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {filmMentali?.map((f: any) => (
                    <Card key={f.id} className="overflow-hidden hover:shadow-lg transition-shadow border-orange-100">
                      <div className="bg-orange-50 p-3 flex justify-between items-center border-b border-orange-100">
                        <div className="font-bold text-orange-900 flex items-center gap-2 truncate max-w-[80%]">
                          <Film className="h-4 w-4 shrink-0" />
                          <span className="truncate">{f.titolo}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => deleteFilmMutation.mutate(f.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="p-4 space-y-2 text-sm">
                        <div className="flex gap-2">
                          <span className="font-semibold text-orange-700">Articolo:</span>
                          <span>{f.articolo}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-orange-700">Attore:</span>
                          <span>{f.soggettoAttivo}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-orange-700">Azione:</span>
                          <span className="italic">"{f.condotta}"</span>
                        </div>
                        {f.tags && f.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {f.tags.map((tag: string, i: number) => (
                              <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {filmMentali?.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8 bg-gray-50 rounded-lg border border-dashed">
                      Nessun film mentale creato. Inizia la tua regia!
                    </div>
                  )}
                </div>
              </div>
            </CardContent> 
          </Card> 
        </TabsContent> 
      </Tabs> 
    </div> 
  ); 
}