import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Book, Brain, TrendingUp, Target, Lightbulb,
  CheckCircle, Award, BookOpen, Download, ExternalLink, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LibreriaPubblicaPage() {
  const [, setLocation] = useLocation();
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

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
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="mindset" className="gap-2">
            <Brain className="h-4 w-4" />
            Ingegneria del Valore Umano
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <Book className="h-4 w-4" />
            Guide di Studio
          </TabsTrigger>
          <TabsTrigger value="materiali" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Materiali Pubblici
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
        <TabsContent value="materiali">
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Materiali Pubblici</h3>
              <p className="text-muted-foreground mb-6">
                Questa sezione conterrà dispense, schemi e materiali condivisi dalla community.
              </p>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>
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
                  "Mi impegno a studiare con costanza perché voglio diventare [RUOLO] per garantire a me stesso e a [PERSONE CARE] una vita fatta di [VALORI: es. stabilità, dignità].<br/><br/>
                  Accetto la fatica di oggi perché è il prezzo per non dover più subire [DOLORE DA EVITARE].<br/><br/>
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