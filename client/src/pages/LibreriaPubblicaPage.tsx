import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Book, Brain, TrendingUp, Target, Lightbulb,
  CheckCircle, Award, BookOpen, Download, ExternalLink, Clock,
  Home, Hash, Film, Trash2, Plus, Scale, Folder, FolderOpen,
  Wind, Moon, Droplets, Heart, Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BibliotecaNormativa } from '@/components/BibliotecaNormativa';
import { UploadMaterial } from '@/components/UploadMaterial';
import { MaterialCard } from '@/components/MaterialCard';

// Types for API responses
interface Norma {
  id: string;
  urn: string;
  tipo: string;
  numero?: string;
  anno: number;
  titolo: string;
  titoloBreve?: string;
  urlNormattiva: string;
  keywords?: string[];
}

interface DocumentoLibreria {
  id: string;
  titolo: string;
  descrizione?: string;
  materia: string;
  tags?: string[];
  fileName?: string;
  fileSize?: number;
  hasPdf?: boolean;
  pdfUrl?: string;
  downloadCount?: number;
  createdAt?: string;
}


export default function LibreriaPubblicaPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  // State per Materiali
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Fetch normative from API
  const { data: normativeData, isLoading: isLoadingNormative } = useQuery<Norma[]>({
    queryKey: ['norme', 'search'],
    queryFn: async () => {
      const res = await fetch('/api/norme/search?limit=50');
      if (!res.ok) throw new Error('Errore nel caricamento delle normative');
      return res.json();
    },
  });

  // Fetch documenti libreria from API
  const { data: documentiData, isLoading: isLoadingDocumenti, refetch: refetchDocumenti } = useQuery<DocumentoLibreria[]>({
    queryKey: ['libreria', 'documenti', selectedMateria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMateria) params.append('materia', selectedMateria);
      const res = await fetch(`/api/libreria/documenti?${params.toString()}`);
      if (!res.ok) throw new Error('Errore nel caricamento dei documenti');
      return res.json();
    },
  });

  // Transform normative for BibliotecaNormativa component
  const normativeForComponent = (normativeData || []).map((norma) => ({
    id: norma.id,
    nome: norma.titoloBreve || norma.titolo,
    articoliAnalizzati: 0, // This could be enhanced with actual article count
    stato: 'completato' as const,
    url: norma.urlNormattiva,
  }));

  // Transform documenti for MaterialCard component
  const materials = (documentiData || []).map((doc) => ({
    id: doc.id,
    title: doc.titolo,
    type: 'documento' as const,
    status: 'completed' as const,
    flashcardsCount: 0,
    quizzesCount: 0,
    materia: doc.materia,
    fileUrl: doc.pdfUrl,
    hasPdf: doc.hasPdf,
  }));

  const materie = [
    "Diritto Amministrativo",
    "Diritto Costituzionale",
    "Diritto Civile",
    "Contabilità Pubblica",
    "Economia Aziendale",
    "Informatica",
    "Lingua Inglese",
    "Logica",
    "Storia",
    "Geografia",
    "Testi Specifici per Concorsi Pubblici",
    "Altro"
  ];

  const handleUpload = async (file: File, title: string, type: string) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('titolo', title);
      formData.append('materia', selectedMateria || 'Diritto Costituzionale');
      formData.append('tags', JSON.stringify([type]));

      const res = await fetch('/api/libreria/documenti', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel caricamento');
      }

      toast({
        title: "Documento caricato",
        description: `${title} è stato caricato con successo`,
      });

      // Refresh documenti list
      refetchDocumenti();
      setIsUploadOpen(false);
    } catch (error: any) {
      console.error("Errore upload:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore nel caricamento del documento",
        variant: "destructive",
      });
    }
  };

  const handleViewMaterial = async (id: string) => {
    try {
      // Fetch full documento with PDF
      const res = await fetch(`/api/libreria/documenti/${id}`);
      if (!res.ok) throw new Error('Documento non trovato');

      const documento = await res.json();

      if (documento.pdfBase64) {
        // Open base64 PDF in new tab
        const pdfBlob = await fetch(`data:application/pdf;base64,${documento.pdfBase64}`).then(r => r.blob());
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        // Log download
        fetch(`/api/libreria/documenti/${id}/download`, { method: 'POST' });
      } else if (documento.pdfUrl) {
        window.open(documento.pdfUrl, '_blank');
      } else {
        toast({
          title: "Documento non disponibile",
          description: `Il PDF per ${documento.titolo} non è disponibile`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Errore apertura documento:', error);
      toast({
        title: "Errore",
        description: "Impossibile aprire il documento",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Libreria Pubblica</h1>
          <p className="text-muted-foreground">Risorse, guide e materiali per la tua preparazione</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="mindset" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="mindset" className="gap-2">
            <Brain className="h-4 w-4" />
            Mindset
          </TabsTrigger>
          <TabsTrigger value="mnemotecniche" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Mnemotecniche
          </TabsTrigger>

          <TabsTrigger value="guide" className="gap-2">
            <Book className="h-4 w-4" />
            Guide
          </TabsTrigger>
          <TabsTrigger value="materiali" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Materiali
          </TabsTrigger>
        </TabsList>

        {/* TAB MINDSET */}
        <TabsContent value="mindset" className="space-y-6">

          {/* Intro Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Ingegneria del Valore Umano</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Il successo concorsuale è un'equazione dove <strong>la variabile psicologica
                      pesa quanto quella tecnica</strong>. La preparazione non è un evento,
                    ma un <strong>processo di trasformazione personale</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* I 3 Pilastri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Pilastro 1: Growth Mindset */}
            <Card
              className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedArticle('growth-mindset')}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-100 text-green-700">Pilastro 1</Badge>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Growth Mindset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Trasforma ogni errore in un dato diagnostico prezioso per il tuo apprendimento.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Leggi l'articolo completo →
                </Button>
              </CardContent>
            </Card>

            {/* Pilastro 2: Resilienza */}
            <Card
              className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedArticle('resilienza')}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-100 text-blue-700">Pilastro 2</Badge>
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Resilienza alla Monotonia</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Allena la tolleranza alla noia come un muscolo per studiare con costanza.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Leggi l'articolo completo →
                </Button>
              </CardContent>
            </Card>

            {/* Pilastro 3: Visione Strategica */}
            <Card
              className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedArticle('visione')}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-purple-100 text-purple-700">Pilastro 3</Badge>
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Visione Strategica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Supera i plateau con una visione chiara dell'obiettivo finale.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Leggi l'articolo completo →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Articoli Approfondimento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Articolo: Come affrontare gli errori */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="secondary">Growth Mindset</Badge>
                </div>
                <CardTitle className="text-base">
                  Come Trasformare gli Errori in Opportunità
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Guida pratica per analizzare ogni errore nei quiz e trasformarlo
                  in un apprendimento concreto.
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Il framework dell'errore diagnostico</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Template di riflessione post-errore</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Pattern di errore ricorrenti</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedArticle('errori-opportunita')}
                >
                  Leggi →
                </Button>
              </CardContent>
            </Card>

            {/* Articolo: Costruire abitudini */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <Badge variant="secondary">Resilienza</Badge>
                </div>
                <CardTitle className="text-base">
                  Costruire Abitudini di Studio Indistruttibili
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Come creare una routine di studio che resiste alla noia e
                  ai momenti di scarsa motivazione.
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Il potere del rituale quotidiano</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Tecnica Pomodoro avanzata</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>Gestire le serie (streak) di studio</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedArticle('abitudini-studio')}
                >
                  Leggi →
                </Button>
              </CardContent>
            </Card>

            {/* Articolo: Superare il Plateau */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <Badge variant="secondary">Visione</Badge>
                </div>
                <CardTitle className="text-base">
                  Superare il Plateau: La Curva dell'Apprendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Perché i progressi sembrano fermarsi e come uscire dalla fase
                  di stallo con strategie comprovate.
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li className="flex gap-2">
                    <span className="text-purple-600">✓</span>
                    <span>Riconoscere il plateau</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600">✓</span>
                    <span>Strategie anti-plateau</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600">✓</span>
                    <span>Mantenere la visione a lungo termine</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedArticle('superare-plateau')}
                >
                  Leggi →
                </Button>
              </CardContent>
            </Card>

            {/* Articolo: Dichiarazione di Visione */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-orange-600" />
                  <Badge variant="secondary">Esercizio Pratico</Badge>
                </div>
                <CardTitle className="text-base">
                  Scrivi la Tua Dichiarazione di Visione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Esercizio guidato per definire il tuo "perché profondo" e
                  creare una visione motivante per i momenti difficili.
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li className="flex gap-2">
                    <span className="text-orange-600">✓</span>
                    <span>Template dichiarazione di visione</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600">✓</span>
                    <span>Domande di auto-riflessione</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600">✓</span>
                    <span>Come usarla nei momenti di crisi</span>
                  </li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedArticle('dichiarazione-visione')}
                >
                  Inizia l'esercizio →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Risorse Aggiuntive */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Risorse Scaricabili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Template Analisi Errori (PDF)
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Checklist Routine Quotidiana (PDF)
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Diario di Studio (Excel)
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Template Dichiarazione Visione (DOC)
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* TAB MNEMOTECNICHE - TEORIA */}
        <TabsContent value="mnemotecniche" className="space-y-6">

          {/* Intro Card */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-2 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <Lightbulb className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Mnemotecniche per il Diritto</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Il diritto non va imparato a memoria parola per parola, ma per
                    <strong> concetti e parole chiave</strong>. Tuttavia, alcuni dati
                    (articoli, termini, numeri di codici) vanno memorizzati con tecniche scientifiche.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Le 3 Tecniche Principali */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. Palazzo della Memoria */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-purple-100 text-purple-700">Tecnica 1</Badge>
                  <Home className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Tecnica dei Loci (Palazzo della Memoria)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Associa ogni articolo di legge a una stanza della tua casa.
                  Tecnica usata dai campioni mondiali di memoria.
                </p>
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg text-xs space-y-2">
                  <p><strong>Come funziona:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• Immagina la tua casa (o un palazzo virtuale)</li>
                    <li>• Associa ogni stanza a un capo della legge</li>
                    <li>• Crea immagini vivide e bizzarre in ogni stanza</li>
                    <li>• Percorri mentalmente il palazzo per ricordare</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 2. Conversione Fonetica */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-100 text-blue-700">Tecnica 2</Badge>
                  <Hash className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Conversione Fonetica (Leibniz)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Trasforma numeri (Art. 328) in parole memorabili
                  con il sistema fonetico di Leibniz.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs space-y-2">
                  <p><strong>Sistema di conversione:</strong></p>
                  <div className="grid grid-cols-2 gap-1 font-mono">
                    <div>1 = T/D</div>
                    <div>6 = C/G</div>
                    <div>2 = N</div>
                    <div>7 = K/Q</div>
                    <div>3 = M</div>
                    <div>8 = F/V</div>
                    <div>4 = R</div>
                    <div>9 = P/B</div>
                    <div>5 = L</div>
                    <div>0 = S/Z</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Film Mentali */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-100 text-green-700">Tecnica 3</Badge>
                  <Film className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Visualizzazione (Film Mentali)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Crea "film mentali" dei reati per memorizzare
                  elementi costitutivi e soggetti coinvolti.
                </p>
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-xs space-y-2">
                  <p><strong>Elementi da visualizzare:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• 👤 Soggetto attivo (chi commette)</li>
                    <li>• ⚡ Condotta (azione compiuta)</li>
                    <li>• 🎯 Evento (conseguenza)</li>
                    <li>• 🔗 Nesso causale (collegamento)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Esempi Pratici Dettagliati */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold">📚 Esempi Pratici Completi</h3>

            {/* Esempio 1: Palazzo */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-purple-600" />
                  Legge 241/90 con Palazzo della Memoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Immagina la tua casa. Ogni stanza rappresenta un articolo della legge sul procedimento amministrativo.
                </p>

                <div className="space-y-3">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 text-white shrink-0">Ingresso</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Art. 1 - Principi Generali</h4>
                        <p className="text-sm text-muted-foreground">
                          💭 <strong>Immagine:</strong> Un vigile urbano ti dà il benvenuto all'ingresso.
                          È trasparente (ha una divisa di vetro) ma è molto sbrigativo e veloce
                          (economicità e efficacia). Ti consegna una cartina (pubblicità).
                        </p>
                        <div className="mt-2 text-xs">
                          <strong>Concetti memorizzati:</strong> Trasparenza, Economicità, Efficacia, Pubblicità
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 text-white shrink-0">Cucina</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Art. 2 - Termini del Procedimento</h4>
                        <p className="text-sm text-muted-foreground">
                          💭 <strong>Immagine:</strong> Un timer da cucina gigante che suona forte.
                          Sul frigo c'è un calendario con date cerchiate in rosso (scadenze).
                          Il timer fa "TIC-TAC" ossessivamente (30 giorni se non specificato).
                        </p>
                        <div className="mt-2 text-xs">
                          <strong>Concetti memorizzati:</strong> Termini procedimentali, 30 giorni default, Scadenze
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-purple-600 text-white shrink-0">Salotto</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">Art. 3 - Motivazione degli Atti</h4>
                        <p className="text-sm text-muted-foreground">
                          💭 <strong>Immagine:</strong> Una persona in piedi sul divano che fa un discorso
                          solenne e drammatico, gesticolando. Deve spiegare e motivare PERCHÉ è salita
                          sul divano. Ha in mano documenti (presupposti di fatto e ragioni giuridiche).
                        </p>
                        <div className="mt-2 text-xs">
                          <strong>Concetti memorizzati:</strong> Obbligo di motivazione, Presupposti di fatto, Ragioni giuridiche
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 text-sm">
                  <p className="font-semibold mb-2">💡 Principi per immagini efficaci:</p>
                  <ul className="space-y-1 text-xs ml-4">
                    <li>• <strong>Esagerazione:</strong> Rendi tutto enorme o minuscolo</li>
                    <li>• <strong>Assurdità:</strong> Più bizzarro = più memorabile</li>
                    <li>• <strong>Movimento:</strong> Azioni dinamiche restano impresse</li>
                    <li>• <strong>Emozioni:</strong> Associa sentimenti vividi (paura, gioia, disgusto)</li>
                    <li>• <strong>Coinvolgimento personale:</strong> Mettiti nella scena</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Esempio 2: Conversione Fonetica */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-blue-600" />
                  Art. 328 CP - Rifiuto d'Atti d'Ufficio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Come memorizzare il numero 328 usando la conversione fonetica.
                </p>

                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-3 text-sm">📊 Processo di Conversione</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">3</Badge>
                        <span>→</span>
                        <span className="font-semibold">M</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">2</Badge>
                        <span>→</span>
                        <span className="font-semibold">N</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">8</Badge>
                        <span>→</span>
                        <span className="font-semibold">F/V</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border-2 border-blue-300">
                    <p className="text-sm mb-2"><strong>Codice fonetico:</strong> M - N - F/V</p>
                    <p className="text-2xl font-bold text-blue-600 mb-2">MaNiaCo</p>
                    <p className="text-sm text-muted-foreground">
                      💭 <strong>Immagine mentale:</strong> Un funzionario pubblico con espressione
                      "maniaca" che sbatte la porta in faccia a un cittadino e RIFIUTA ostinatamente
                      di fare il suo dovere. Ha un'espressione ossessiva e compulsiva.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded border text-sm">
                      <p className="font-semibold mb-1">Alternative:</p>
                      <ul className="text-xs space-y-1">
                        <li>• MaNiFà (manifà qualcosa)</li>
                        <li>• MoNaFa</li>
                        <li>• MiNiFa</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded border text-sm">
                      <p className="font-semibold mb-1">Regole:</p>
                      <ul className="text-xs space-y-1">
                        <li>• Usa solo consonanti del codice</li>
                        <li>• Vocali libere (a,e,i,o,u)</li>
                        <li>• Scegli parola più vivida</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 text-sm">
                  <p className="font-semibold mb-2">🎯 Altri Esempi:</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono w-16">624</Badge>
                      <span>→ C-N-R →</span>
                      <span className="font-semibold">CaNaRo / GeNeRo / CiNeMa</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono w-16">241</Badge>
                      <span>→ N-R-T →</span>
                      <span className="font-semibold">NaRDo / NeReTo</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono w-16">90</Badge>
                      <span>→ P/B-S →</span>
                      <span className="font-semibold">BuS / PaSo / BaSe</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Esempio 3: Film Mentale */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-green-600" />
                  Art. 624 CP - Furto (Film Mentale)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Visualizza il reato come una scena cinematografica per memorizzare
                  tutti gli elementi costitutivi.
                </p>

                <div className="space-y-3">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-3">🎬 Sceneggiatura Mentale</h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">Setting</Badge>
                        <div>
                          <p><strong>Luogo:</strong> Gioielleria di notte, luci spente, via deserta</p>
                          <p className="text-muted-foreground text-xs">Visualizza: vetrine lucide, manichini, silenzio</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">👤 Soggetto Attivo</Badge>
                        <div>
                          <p><strong>Ladro con passamontagna nero</strong> - Guanti neri, torcia tascabile</p>
                          <p className="text-muted-foreground text-xs">
                            💡 Chiunque (non serve qualifica speciale per il furto)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">⚡ Condotta</Badge>
                        <div>
                          <p><strong>Impossessamento della cosa mobile altrui</strong></p>
                          <p className="text-xs mt-1">
                            AZIONE 1: Rompe la vetrina con un martello (CRASH!)<br />
                            AZIONE 2: Infila la mano e PRENDE una collana d'oro<br />
                            AZIONE 3: La mette in tasca e SCAPPA via
                          </p>
                          <p className="text-muted-foreground text-xs mt-2">
                            💡 "Impossessamento" = sottrazione + disponibilità esclusiva
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">🎯 Evento</Badge>
                        <div>
                          <p><strong>Privazione del possesso al proprietario</strong></p>
                          <p className="text-muted-foreground text-xs">
                            Il gioielliere la mattina dopo trova la vetrina vuota.
                            La collana non c'è più. Lui l'ha PERSA, il ladro l'ha OTTENUTA.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">🔗 Nesso</Badge>
                        <div>
                          <p><strong>Nesso causale</strong></p>
                          <p className="text-muted-foreground text-xs">
                            L'azione del ladro (prendere) ha CAUSATO la perdita del possesso.
                            Linea diretta: azione → conseguenza.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-600 shrink-0">🧠 Dolo</Badge>
                        <div>
                          <p><strong>Elemento psicologico</strong></p>
                          <p className="text-muted-foreground text-xs">
                            Il ladro SAPEVA che la collana non era sua e VOLEVA comunque prenderla.
                            Visualizza il suo sorriso malefico mentre scappa.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border-2 border-green-300">
                    <p className="font-semibold mb-2 text-sm">🎥 Riproduci il Film Mentale</p>
                    <p className="text-xs text-muted-foreground italic">
                      "È notte. Vedo il ladro avvicinarsi alla gioielleria. Guanti neri, passamontagna.
                      CRASH! Rompe la vetrina. La mano entra veloce. Afferra la collana. Lucida, pesante, d'oro.
                      La ficca in tasca. Si gira. Corre via nella notte. La mattina dopo: vetrina vuota,
                      gioielliere disperato. Collana sparita. Possesso perso."
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 text-sm">
                  <p className="font-semibold mb-2">💡 Principi del Film Mentale:</p>
                  <ul className="space-y-1 text-xs ml-4">
                    <li>• <strong>Prima persona:</strong> Mettiti nella scena come se la stessi guardando</li>
                    <li>• <strong>Dettagli sensoriali:</strong> Suoni (CRASH), colori (nero, oro), sensazioni</li>
                    <li>• <strong>Slow motion:</strong> Rallenta i momenti chiave (mano che afferra)</li>
                    <li>• <strong>Emozioni:</strong> Paura, eccitazione, urgenza</li>
                    <li>• <strong>Ripetizione:</strong> Rivedi il film 3-4 volte per fissarlo</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Tool Interattivi */}
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="pt-6 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-2xl font-bold mb-2">
                Pronto a Mettere in Pratica?
              </h3>
              <p className="mb-6 opacity-90">
                Usa i tool interattivi per creare i tuoi palazzi, convertire numeri e costruire film mentali
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setLocation('/mnemotecniche')}
              >
                Vai ai Tool Interattivi
              </Button>
            </CardContent>
          </Card>

        </TabsContent>

        {/* TAB GUIDE DI STUDIO */}
        <TabsContent value="guide">
          <Card>
            <CardContent className="p-12 text-center">
              <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Guide di Studio</h3>
              <p className="text-muted-foreground mb-6">
                Questa sezione conterrà guide pratiche per lo studio delle materie principali.
              </p>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB MATERIALI PUBBLICI */}
        <TabsContent value="materiali" className="space-y-8">

          {/* Sezione 1: Biblioteca Normativa AI */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Biblioteca Normativa AI
            </h3>
            <p className="text-muted-foreground text-sm">
              Accedi alle principali leggi analizzate dall'AI con collegamenti diretti e quiz generati.
            </p>
            {isLoadingNormative ? (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Caricamento normative...</span>
                </CardContent>
              </Card>
            ) : (
              <BibliotecaNormativa
                normative={normativeForComponent}
                isLoading={isLoadingNormative}
                onUploadPdf={(file) => console.log('Upload law', file)}
                onGoToQuiz={() => setLocation('/quiz')}
                onViewStats={() => setLocation('/stats')}
              />
            )}
          </div>

          <div className="border-t my-8" />

          {/* Sezione 2: Cartelle per Materie */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Documenti Consultabili
              </h3>
            </div>

            <p className="text-muted-foreground text-sm mb-4">
              Consulta i nostri documenti , dispense e schemi divisi per materia
            </p>

            {selectedMateria ? (
              // VISTA DENTRO LA CARTELLA
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedMateria(null)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Torna indietro
                    </Button>
                    <div className="h-6 w-px bg-border mx-2" />
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {selectedMateria}
                    </h4>
                  </div>

                  <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Carica Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg p-0">
                      <UploadMaterial
                        onUpload={handleUpload}
                        onCancel={() => setIsUploadOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Lista Materiali */}
                {isLoadingDocumenti ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Caricamento documenti...</span>
                  </div>
                ) : materials.filter(m => m.materia === selectedMateria).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials
                      .filter(m => m.materia === selectedMateria)
                      .map((material) => (
                        <MaterialCard
                          key={material.id}
                          {...material}
                          onView={handleViewMaterial}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                    <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-medium">Cartella Vuota</h3>
                    <p className="text-muted-foreground mb-4">
                      Non hai ancora caricato materiali per {selectedMateria}.
                    </p>
                    <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                      Carica il primo file
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // VISTA LISTA CARTELLE
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {materie.map(materia => {
                  const count = materials.filter(m => m.materia === materia).length;
                  return (
                    <Card
                      key={materia}
                      className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-all group"
                      onClick={() => setSelectedMateria(materia)}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full group-hover:scale-110 transition-transform">
                          <Folder className="h-8 w-8 text-yellow-600 dark:text-yellow-500 fill-yellow-600/20" />
                        </div>
                        <div>
                          <span className="font-semibold block">{materia}</span>
                          <span className="text-xs text-muted-foreground">{count} documenti</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Articolo (opzionale - puoi espandere dopo) */}
      {selectedArticle && (
        <ArticleModal
          articleId={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  );
}

// Componente Modal Articolo
function ArticleModal({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  // Contenuto dell'articolo "Come Trasformare gli Errori in Opportunità"
  const getArticleContent = (id: string) => {
    if (id === 'errori-opportunita') {
      return (
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-primary mb-4">Guida pratica per analizzare ogni errore nei quiz e trasformarlo in un apprendimento concreto.</h3>

            <p className="text-muted-foreground mb-6">
              L'errore non è un fallimento, è un dato. Nel contesto della preparazione ai concorsi, ogni risposta sbagliata vale oro: ti indica esattamente dove risiede una lacuna che, se colmata ora, non ti tradirà il giorno dell'esame.
            </p>

            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  1. Il Framework dell'Errore Diagnostico
                </h4>
                <p className="text-sm text-foreground/80">
                  Smetti di dire "ho sbagliato". Inizia a chiederti "perché ho sbagliato?". Classifica ogni errore in una di queste categorie:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground/80">
                  <li><strong>Errore Tecnico:</strong> Non sapevi la regola o il concetto. (Soluzione: Studio/Ripasso)</li>
                  <li><strong>Errore di Lettura:</strong> Hai letto male la domanda o le opzioni. (Soluzione: Rallenta, usa il dito per leggere)</li>
                  <li><strong>Errore di Ragionamento:</strong> Sapevi la regola ma l'hai applicata male. (Soluzione: Esercizi guidati)</li>
                  <li><strong>Errore Emotivo:</strong> Ansia o fretta ti hanno bloccato. (Soluzione: Respirazione, Simulazione)</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5" />
                  2. Template di Riflessione Post-Errore
                </h4>
                <p className="text-sm text-foreground/80">
                  Per ogni errore significativo, prenditi 30 secondi per compilare questo schema mentale o cartaceo:
                </p>
                <div className="mt-3 bg-white dark:bg-slate-950 p-3 rounded border border-blue-200 dark:border-blue-800 font-mono text-sm">
                  <p><strong>Domanda:</strong> [Riassunto breve]</p>
                  <p><strong>La mia risposta:</strong> [Cosa ho messo]</p>
                  <p><strong>Risposta corretta:</strong> [Qual era]</p>
                  <p><strong>Perché ho sbagliato?</strong> [Analisi profonda]</p>
                  <p><strong>Azione Correttiva:</strong> [Cosa farò per non ripeterlo?]</p>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5" />
                  3. Pattern di Errore Ricorrenti
                </h4>
                <p className="text-sm text-foreground/80">
                  Analizzando i tuoi errori nel tempo, noterai dei pattern. Cadi sempre sulle date? Sulle definizioni legislative? O sulle domande a risposta negativa ("Quale NON è...")?
                </p>
                <p className="text-sm text-foreground/80 mt-2">
                  Identificare il pattern significa risolvere il problema alla radice. Se sbagli sempre le date, crea una linea temporale dedicata. Se sbagli le negazioni, cerchia sempre la parola "NON" quando leggi le domande.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'abitudini-studio') {
      return (
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-primary mb-4">Come creare una routine di studio che resiste alla noia e ai momenti di scarsa motivazione.</h3>

            <p className="text-muted-foreground mb-6">
              La motivazione è un'emozione, ed è volubile. L'abitudine è un automatismo, ed è affidabile. Per vincere un concorso, non ti serve più forza di volontà, ti servono abitudini indistruttibili che ti portino alla scrivania anche quando non ne hai voglia.
            </p>

            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5" />
                  1. Il Potere del Rituale Quotidiano
                </h4>
                <p className="text-sm text-foreground/80">
                  Il cervello ama i segnali di innesco (trigger). Crea un rituale di 5 minuti che preceda SEMPRE lo studio. Esempio:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground/80">
                  <li>Pulisci la scrivania (Tabula Rasa).</li>
                  <li>Riempi la borraccia d'acqua.</li>
                  <li>Metti il telefono in un'altra stanza.</li>
                  <li>Accendi una luce specifica o metti le cuffie.</li>
                </ul>
                <p className="text-sm text-foreground/80 mt-2">
                  Dopo 2 settimane, questi gesti diranno al tuo cervello "è ora di concentrarsi" in automatico, bypassando la resistenza iniziale.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5" />
                  2. Tecnica Pomodoro Avanzata
                </h4>
                <p className="text-sm text-foreground/80">
                  Non pensare "devo studiare 4 ore". È spaventoso. Pensa "devo fare solo 25 minuti".
                </p>
                <div className="mt-3 bg-white dark:bg-slate-950 p-3 rounded border border-orange-200 dark:border-orange-800 text-sm">
                  <p><strong>Ciclo Standard:</strong> 25 min Focus + 5 min Pausa.</p>
                  <p><strong>Ciclo "Flow":</strong> 50 min Focus + 10 min Pausa (solo per materie complesse).</p>
                  <p><strong>Regola d'Oro:</strong> Nella pausa NON usare lo smartphone/social. Il cervello deve riposare, non ricevere nuovi stimoli dopaminergici. Alzati, bevi, guarda fuori dalla finestra.</p>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  3. Gestire le Serie (Streak) di Studio
                </h4>
                <p className="text-sm text-foreground/80">
                  "Non spezzare la catena". Usa un calendario o questa app per segnare ogni giorno in cui studi, anche solo 15 minuti.
                </p>
                <p className="text-sm text-foreground/80 mt-2">
                  <strong>La regola dei due giorni:</strong> Puoi saltare un giorno (imprevisti accadono), ma MAI due di fila. Saltare due giorni crea una nuova abitudine: quella di non studiare. Se ieri non hai studiato, oggi è la priorità assoluta, anche solo per mezz'ora.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'superare-plateau') {
      return (
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-primary mb-4">Perché i progressi sembrano fermarsi e come uscire dalla fase di stallo con strategie comprovate.</h3>

            <p className="text-muted-foreground mb-6">
              Il plateau è una fase naturale dell'apprendimento dove i risultati visibili si fermano, ma la consolidazione neurale continua. È il momento in cui la maggior parte dei candidati molla, ed è proprio qui che si vince il concorso.
            </p>

            <div className="space-y-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5" />
                  1. Riconoscere il Plateau
                </h4>
                <p className="text-sm text-foreground/80">
                  Stai studiando ma i punteggi non salgono? Ti senti bloccato? Non è un segnale di incapacità, è un segnale che il metodo attuale ha esaurito la sua spinta iniziale.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  2. Strategie Anti-Plateau
                </h4>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground/80">
                  <li><strong>Variazione:</strong> Cambia fonte di studio o modalità (es. dai libri ai quiz).</li>
                  <li><strong>Sovraccarico progressivo:</strong> Aumenta la difficoltà, non la quantità.</li>
                  <li><strong>Recupero attivo:</strong> Stacca per 24 ore complete per permettere al cervello di resettarsi.</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5" />
                  3. Mantenere la Visione a Lungo Termine
                </h4>
                <p className="text-sm text-foreground/80">
                  Il plateau è temporaneo. La curva dell'apprendimento riprenderà a salire improvvisamente (il cosiddetto "breakthrough"). La tua unica strategia deve essere la persistenza intelligente.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (id === 'dichiarazione-visione') {
      return (
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-primary mb-4">Esercizio guidato per definire il tuo "perché profondo".</h3>

            <p className="text-muted-foreground mb-6">
              Nei momenti bui, quando la stanchezza prevale e i risultati non arrivano, la forza di volontà non basta. Serve una Visione. Questo esercizio ti aiuterà a scriverla.
            </p>

            <div className="space-y-6">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-l-4 border-orange-500">
                <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5" />
                  1. Domande di Auto-Riflessione
                </h4>
                <p className="text-sm text-foreground/80 mb-3">
                  Prendi carta e penna. Rispondi onestamente a queste domande (non scrivere ciò che "dovresti", ma ciò che senti):
                </p>
                <ul className="list-decimal pl-5 space-y-2 text-sm text-foreground/80 italic">
                  <li>Come cambierà la mia vita quotidiana una volta vinto il concorso? (Immagina la mattina tipo)</li>
                  <li>Chi renderò orgoglioso con questo successo? (Genitori, figli, partner, me stesso bambino)</li>
                  <li>Qual è il "dolore" che voglio lasciarmi alle spalle per sempre? (Precariato, insoddisfazione, dipendenza economica)</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <Book className="h-5 w-5" />
                  2. Template Dichiarazione di Visione
                </h4>
                <p className="text-sm text-foreground/80 mb-3">
                  Usa le risposte sopra per riempire questo modello. Rendilo solenne.
                </p>
                <div className="bg-white dark:bg-slate-950 p-4 rounded border border-blue-200 dark:border-blue-800 font-serif text-lg leading-relaxed italic text-center">
                  "Mi impegno a studiare con costanza perché voglio diventare [RUOLO] per garantire a me stesso e a [PERSONE CARE] una vita fatta di [VALORI: es. stabilità, dignità].<br /><br />
                  Accetto la fatica di oggi perché è il prezzo per non dover più subire [DOLORE DA EVITARE].<br /><br />
                  Il mio obiettivo non è solo passare un esame, ma diventare la persona capace di passarlo."
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5" />
                  3. Come usarla nei momenti di crisi
                </h4>
                <p className="text-sm text-foreground/80">
                  Scrivi la dichiarazione a mano. Firmala.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-foreground/80">
                  <li>Appendila davanti alla scrivania.</li>
                  <li>Fanne una foto e mettila come sfondo del telefono.</li>
                  <li><strong>Regola d'oro:</strong> Quando stai per saltare una sessione di studio, rileggila ad alta voce prima di decidere.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Placeholder per altri articoli
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contenuto in fase di scrittura...</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {articleId === 'errori-opportunita' ? 'Come Trasformare gli Errori in Opportunità' : 'Articolo'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {getArticleContent(articleId)}
        </CardContent>
      </Card>
    </div>
  );
}