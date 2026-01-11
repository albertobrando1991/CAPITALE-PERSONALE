import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizResults } from "@/components/QuizResults";
import { ArrowLeft, HelpCircle, Play, X, ExternalLink, Globe, Brain, Sparkles, Handshake, Mail, Bot, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadMaterial } from "@/components/UploadMaterial";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// todo: remove mock functionality
const mockQuizzes = [
  {
    id: "1",
    title: "L. 241/1990 - Procedimento Amministrativo",
    questionsCount: 10,
    difficulty: "Medio",
    lastScore: 80,
    questions: null // Will use mockQuestions fallback
  },
  {
    id: "2",
    title: "D.Lgs. 165/2001 - TUPI",
    questionsCount: 15,
    difficulty: "Difficile",
    lastScore: null,
    questions: null
  },
  {
    id: "3",
    title: "Costituzione - Principi Fondamentali",
    questionsCount: 12,
    difficulty: "Facile",
    lastScore: 95,
    questions: null
  },
];

// todo: remove mock functionality
const defaultMockQuestions = [
  // DIRITTO AMMINISTRATIVO - L. 241/90
  {
    question: "Qual è il termine generale per la conclusione del procedimento amministrativo, in assenza di diversa disposizione?",
    options: ["30 giorni", "45 giorni", "60 giorni", "90 giorni"],
    correctAnswer: 0,
  },
  {
    question: "Chi nomina il Responsabile del Procedimento?",
    options: ["Il Sindaco", "Il Prefetto", "Il dirigente dell'unità organizzativa", "Il Consiglio Comunale"],
    correctAnswer: 2,
  },
  {
    question: "La Conferenza dei Servizi è uno strumento di:",
    options: ["Semplificazione amministrativa", "Controllo contabile", "Gestione del personale", "Sindacato ispettivo"],
    correctAnswer: 0,
  },
  {
    question: "Il silenzio-assenso si applica:",
    options: ["In tutti i procedimenti", "Nei procedimenti a istanza di parte, salvo eccezioni di legge", "Solo nei procedimenti d'ufficio", "Mai"],
    correctAnswer: 1,
  },
  {
    question: "Cosa si intende per 'accesso civico'?",
    options: ["Il diritto di accedere ai documenti per tutelare una posizione giuridica", "Il diritto di chiunque di richiedere documenti che l'PA ha l'obbligo di pubblicare", "L'accesso agli atti giudiziari", "L'accesso ai locali della PA"],
    correctAnswer: 1,
  },
  {
    question: "Il preavviso di rigetto (art. 10-bis L. 241/90) si applica:",
    options: ["Ai procedimenti d'ufficio", "Ai procedimenti a istanza di parte", "Solo ai procedimenti disciplinari", "A tutti i procedimenti"],
    correctAnswer: 1,
  },
  {
    question: "La SCIA (Segnalazione Certificata di Inizio Attività) consente di iniziare l'attività:",
    options: ["Immediatamente", "Dopo 30 giorni", "Dopo 60 giorni", "Dopo l'autorizzazione espressa"],
    correctAnswer: 0,
  },
  {
    question: "È annullabile il provvedimento amministrativo adottato in violazione di legge?",
    options: ["Sì, sempre", "No, mai", "Sì, salvo che sia nullo", "Solo se comporta danno erariale"],
    correctAnswer: 0,
  },
  {
    question: "Il provvedimento amministrativo nullo è:",
    options: ["Sanabile", "Annullabile entro 60 giorni", "Inefficace e insanabile", "Convalidabile"],
    correctAnswer: 2,
  },
  {
    question: "La motivazione del provvedimento amministrativo è obbligatoria?",
    options: ["Sì, per tutti i provvedimenti compresi quelli normativi", "Sì, per ogni provvedimento amministrativo, esclusi gli atti normativi e a contenuto generale", "No, è facoltativa", "Solo per i provvedimenti negativi"],
    correctAnswer: 1,
  },

  // COSTITUZIONE
  {
    question: "Ai sensi della Costituzione italiana, la sovranità appartiene:",
    options: ["Al Parlamento", "Al Governo", "Al Popolo", "Al Presidente della Repubblica"],
    correctAnswer: 2,
  },
  {
    question: "Quale organo esercita il potere legislativo in Italia?",
    options: ["Il Governo", "La Corte Costituzionale", "Il Parlamento", "Il Consiglio Superiore della Magistratura"],
    correctAnswer: 2,
  },
  {
    question: "La bandiera della Repubblica è:",
    options: ["Il tricolore italiano: verde, bianco e rosso", "Il tricolore con lo stemma", "Il vessillo azzurro", "La bandiera europea"],
    correctAnswer: 0,
  },
  {
    question: "L'Italia è una Repubblica:",
    options: ["Federale", "Democratica, fondata sul lavoro", "Presidenziale", "Parlamentare fondata sulla libertà"],
    correctAnswer: 1,
  },
  {
    question: "La libertà personale è:",
    options: ["Inviolabile", "Limitabile dal Prefetto", "Concessa dal Governo", "Soggetta a referendum"],
    correctAnswer: 0,
  },
  {
    question: "Chi è il Capo dello Stato e rappresenta l'unità nazionale?",
    options: ["Il Presidente del Consiglio", "Il Presidente della Repubblica", "Il Presidente del Senato", "Il Papa"],
    correctAnswer: 1,
  },
  {
    question: "La durata del mandato del Presidente della Repubblica è di:",
    options: ["5 anni", "7 anni", "9 anni", "A vita"],
    correctAnswer: 1,
  },
  {
    question: "L'iniziativa delle leggi appartiene:",
    options: ["Solo al Governo", "Al Governo, a ciascun membro delle Camere e agli organi ed enti ai quali sia conferita da legge costituzionale", "Solo al Parlamento", "Solo ai cittadini"],
    correctAnswer: 1,
  },
  {
    question: "La Corte Costituzionale è composta da:",
    options: ["12 giudici", "15 giudici", "20 giudici", "10 giudici"],
    correctAnswer: 1,
  },
  {
    question: "L'art. 97 della Costituzione sancisce i principi di:",
    options: ["Buon andamento e imparzialità dell'amministrazione", "Pareggio di bilancio", "Autonomia locale", "Sussidiarietà"],
    correctAnswer: 0,
  },

  // PUBBLICO IMPIEGO (TUPI)
  {
    question: "Il rapporto di lavoro alle dipendenze della PA è disciplinato:",
    options: ["Esclusivamente dal diritto pubblico", "Dal codice civile e dalle leggi sui rapporti di lavoro subordinato nell'impresa, salvo eccezioni", "Solo dai regolamenti interni", "Dalla Costituzione direttamente"],
    correctAnswer: 1,
  },
  {
    question: "La responsabilità disciplinare del pubblico dipendente consegue a:",
    options: ["Violazione di doveri d'ufficio", "Scarso rendimento politico", "Mancata iscrizione al sindacato", "Errori scusabili"],
    correctAnswer: 0,
  },
  {
    question: "Il licenziamento disciplinare è previsto per:",
    options: ["Mai", "Falsa attestazione della presenza in servizio", "Ritardo di 5 minuti", "Disaccordo con il dirigente"],
    correctAnswer: 1,
  },
  {
    question: "L'accesso al pubblico impiego avviene mediante:",
    options: ["Chiamata diretta", "Concorso pubblico, salvo i casi stabiliti dalla legge", "Ereditarietà", "Nomina politica"],
    correctAnswer: 1,
  },
  {
    question: "Il Codice di Comportamento dei dipendenti pubblici definisce:",
    options: ["Gli stipendi", "I doveri minimi di diligenza, lealtà, imparzialità", "Le ferie", "L'orario di lavoro"],
    correctAnswer: 1,
  },
  {
    question: "L'ARAN è:",
    options: ["L'Agenzia per la Rappresentanza Negoziale delle Pubbliche Amministrazioni", "L'Associazione Regionale Amministrazioni Nuove", "L'Autorità di Regolazione", "Un sindacato"],
    correctAnswer: 0,
  },
  {
    question: "Le mansioni superiori nel pubblico impiego danno diritto:",
    options: ["Alla promozione automatica", "Al trattamento economico corrispondente, ma non alla promozione", "A nulla", "A ferie aggiuntive"],
    correctAnswer: 1,
  },
  {
    question: "Il P.I.A.O. (Piano Integrato di Attività e Organizzazione) ha assorbito:",
    options: ["Il Piano della Performance e il Piano Anticorruzione", "Il Bilancio dello Stato", "Il Codice Civile", "La Costituzione"],
    correctAnswer: 0,
  },

  // DIRITTO DEGLI ENTI LOCALI (TUEL)
  {
    question: "Qual è l'organo di indirizzo e di controllo politico-amministrativo del Comune?",
    options: ["La Giunta", "Il Consiglio Comunale", "Il Sindaco", "Il Segretario Comunale"],
    correctAnswer: 1,
  },
  {
    question: "Chi nomina gli assessori comunali?",
    options: ["Il Prefetto", "Il Consiglio Comunale", "Il Sindaco", "Il popolo"],
    correctAnswer: 2,
  },
  {
    question: "Il Segretario Comunale svolge compiti di:",
    options: ["Collaborazione e assistenza giuridico-amministrativa", "Indirizzo politico", "Gestione tecnica esclusiva", "Rappresentanza legale dell'ente"],
    correctAnswer: 0,
  },
  {
    question: "Il Revisore dei Conti nell'ente locale ha funzioni di:",
    options: ["Vigilanza sulla regolarità contabile, finanziaria ed economica", "Controllo strategico", "Gestione del personale", "Difesa legale"],
    correctAnswer: 0,
  },
  {
    question: "Lo Statuto comunale è deliberato da:",
    options: ["Giunta", "Consiglio Comunale", "Sindaco", "Regione"],
    correctAnswer: 1,
  },

  // REATI CONTRO LA PA
  {
    question: "Il reato di peculato (art. 314 c.p.) è commesso da:",
    options: ["Un privato cittadino", "Il pubblico ufficiale o l'incaricato di pubblico servizio che si appropria di denaro o altra cosa mobile altrui", "Chiunque", "Un imprenditore"],
    correctAnswer: 1,
  },
  {
    question: "La concussione (art. 317 c.p.) si verifica quando il pubblico ufficiale:",
    options: ["Riceve denaro per un atto d'ufficio", "Costringe taluno a dare o promettere indebitamente denaro o altra utilità", "Truffa l'amministrazione", "Falsifica un atto"],
    correctAnswer: 1,
  },
  {
    question: "L'abuso d'ufficio (art. 323 c.p.) richiede:",
    options: ["La violazione di specifiche regole di condotta espressamente previste dalla legge o da atti aventi forza di legge", "La semplice negligenza", "L'errore scusabile", "La violazione di una circolare"],
    correctAnswer: 0,
  },
  {
    question: "L'omissione di atti d'ufficio (art. 328 c.p.) punisce:",
    options: ["Il ritardo nel timbrare il cartellino", "Il rifiuto indebito di un atto che deve essere compiuto senza ritardo", "La mancata risposta al telefono", "L'assenza per malattia"],
    correctAnswer: 1,
  },

  // PRIVACY & DIGITALE (GDPR / CAD)
  {
    question: "Il DPO (Data Protection Officer) è:",
    options: ["Il Responsabile della Protezione dei Dati", "Il Direttore del Personale", "Il Responsabile della sicurezza fisica", "Il Dirigente informatico"],
    correctAnswer: 0,
  },
  {
    question: "Cosa si intende per 'dato sensibile' (ora categorie particolari di dati)?",
    options: ["Dati che rivelano l'origine razziale, le opinioni politiche, la salute, ecc.", "Il codice fiscale", "L'indirizzo di casa", "Il numero di telefono"],
    correctAnswer: 0,
  },
  {
    question: "Il documento informatico ha valore legale?",
    options: ["Mai", "Sì, se rispetta le regole tecniche del CAD", "Solo se stampato", "Solo tra privati"],
    correctAnswer: 1,
  },
  {
    question: "La PEC (Posta Elettronica Certificata) garantisce:",
    options: ["La segretezza del messaggio", "L'integrità del messaggio e l'avvenuta consegna", "L'anonimato del mittente", "La gratuità del servizio"],
    correctAnswer: 1,
  },
  {
    question: "SPID è:",
    options: ["Il Sistema Pubblico di Identità Digitale", "Un antivirus", "Un protocollo di rete", "Una banca dati"],
    correctAnswer: 0,
  },
  {
    question: "L'identità digitale consente di:",
    options: ["Accedere ai servizi online della PA con un'unica credenziale", "Navigare anonimamente", "Non pagare le tasse", "Evitare le file"],
    correctAnswer: 0,
  },
  
  // LOGICA E CULTURA GENERALE (MISTI)
  {
    question: "Completare la serie: 2, 4, 8, 16, ...",
    options: ["20", "24", "30", "32"],
    correctAnswer: 3,
  },
  {
    question: "Quale tra i seguenti non è un capoluogo di regione?",
    options: ["Milano", "Torino", "Reggio Calabria", "Venezia"],
    correctAnswer: 2,
  },
  {
    question: "Il sinonimo di 'abrogare' è:",
    options: ["Istituire", "Annullare/Revocare una norma", "Approvare", "Promulgare"],
    correctAnswer: 1,
  },
  {
    question: "Chi ha scritto la 'Divina Commedia'?",
    options: ["Francesco Petrarca", "Giovanni Boccaccio", "Dante Alighieri", "Giacomo Leopardi"],
    correctAnswer: 2,
  },
  {
    question: "L'Unione Europea ha sede principale a:",
    options: ["Londra", "Ginevra", "Bruxelles", "Parigi"],
    correctAnswer: 2,
  },
  {
    question: "L'Euro è entrato in circolazione come moneta fisica nel:",
    options: ["1999", "2000", "2001", "2002"],
    correctAnswer: 3,
  },
  {
    question: "Il Presidente della Repubblica Italiana viene eletto da:",
    options: ["Dal popolo", "Dal Parlamento in seduta comune integrato dai delegati regionali", "Dal Governo", "Dalla Magistratura"],
    correctAnswer: 1,
  }
];

// Helper per estrarre testo da PDF
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + " ";
  }
  return fullText;
}

// Helper per generare domande dal testo
function generateQuestionsFromText(text: string): any[] {
  // Pulizia testo
  const cleanText = text.replace(/\s+/g, " ").trim();
  
  // Split in frasi (euristica semplice)
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
  
  // Filtra frasi significative
  const validSentences = sentences.filter(s => 
    s.length > 50 && s.length < 250 && // Lunghezza ragionevole
    !s.includes("Pagina") && // Rimuovi intestazioni comuni
    !s.match(/^\d+/) // Rimuovi elenchi numerati isolati
  );

  // Mischia le frasi
  const shuffled = validSentences.sort(() => 0.5 - Math.random());
  
  // Seleziona fino a 50 frasi
  const selectedSentences = shuffled.slice(0, 50);
  
  // Estrai tutte le parole possibili per i distrattori (lunghezza > 4)
  const allWords = cleanText.split(/\s+/).filter(w => w.length > 4 && /^[a-zA-Zàèéìòù]+$/.test(w));

  return selectedSentences.map(sentence => {
    // Trova una parola chiave da nascondere (lunga almeno 5 caratteri)
    const words = sentence.split(/\s+/);
    const candidates = words.filter(w => w.length > 5 && /^[a-zA-Zàèéìòù]+[.!?]?$/.test(w));
    
    if (candidates.length === 0) return null; // Salta se non trova parole adatte
    
    const targetWordRaw = candidates[Math.floor(Math.random() * candidates.length)];
    const targetWordClean = targetWordRaw.replace(/[.!?]/g, ""); // Rimuovi punteggiatura per la risposta
    
    // Crea la domanda con il buco
    const questionText = sentence.replace(targetWordRaw, "_______");
    
    // Genera distrattori
    const distractors: string[] = [];
    while (distractors.length < 3) {
      const randWord = allWords[Math.floor(Math.random() * allWords.length)];
      if (randWord !== targetWordClean && !distractors.includes(randWord)) {
        distractors.push(randWord);
      }
    }
    
    const options = [targetWordClean, ...distractors].sort(() => 0.5 - Math.random());
    
    return {
      question: "Completa la frase tratta dal testo:\n\n" + questionText,
      options: options,
      correctAnswer: options.indexOf(targetWordClean)
    };
  }).filter(q => q !== null); // Rimuovi null
}

export default function QuizPage() {
  const { toast } = useToast();
  
  // Inizializza lo stato caricando da localStorage se disponibile, altrimenti usa mockQuizzes
  const [quizzes, setQuizzes] = useState(() => {
    const saved = localStorage.getItem("userQuizzes");
    return saved ? JSON.parse(saved) : mockQuizzes;
  });

  // Salva in localStorage ogni volta che quizzes cambia
  useEffect(() => {
    localStorage.setItem("userQuizzes", JSON.stringify(quizzes));
  }, [quizzes]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<{ isCorrect: boolean; selectedIndex: number }[]>([]);
  const [startTime] = useState(Date.now());
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  
  // Stato per le domande del quiz corrente
  const [activeQuestions, setActiveQuestions] = useState<any[]>(defaultMockQuestions);

  const handleStartQuiz = (quizId?: string) => {
    // Se viene passato un ID, carica le domande di quel quiz
    if (quizId) {
      const quiz = quizzes.find((q: any) => q.id === quizId);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        setActiveQuestions(quiz.questions);
      } else {
        // Fallback per quiz vecchi o mock
        setActiveQuestions(defaultMockQuestions);
      }
    }
    
    setIsPlaying(true);
    setCurrentQuestion(0);
    setShowResults(false);
    setAnswers([]);
  };

  const handleGenerateQuiz = async (file: File, title: string, type: string) => {
    // Generazione quiz AI via server
    toast({
      title: "Caricamento e Analisi...",
      description: "L'AI sta leggendo il documento e generando le domande...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/quiz/generate-from-file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = "Errore durante la generazione";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Fallback if not JSON (e.g. 404 HTML)
          console.error("Non-JSON error response:", e);
          const text = await response.text().catch(() => "");
          console.error("Response text:", text.substring(0, 500));
          errorMsg = `Errore server: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const generatedQuestions = data.questions;

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("L'AI non ha generato domande valide dal documento.");
      }

      // 3. Crea il quiz
      const newQuiz = {
        id: String(Date.now()),
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        questionsCount: generatedQuestions.length,
        difficulty: "Adattivo (dal testo)",
        lastScore: null,
        questions: generatedQuestions
      };

      setQuizzes(prev => [newQuiz, ...prev]);
      setIsGeneratorOpen(false);

      toast({
        title: "Quiz Generato con Successo! 🤖",
        description: `Create ${generatedQuestions.length} domande basate ESCLUSIVAMENTE sul tuo documento.`,
        duration: 5000,
      });

    } catch (error: any) {
      console.error("Errore generazione quiz:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare il quiz.",
        variant: "destructive"
      });
    }
  };

  const handleAnswer = (isCorrect: boolean, selectedIndex: number) => {
    setAnswers((prev) => [...prev, { isCorrect, selectedIndex }]);
  };

  const handleDeleteQuiz = (id: string) => {
    setQuizzes((prev: any[]) => prev.filter((quiz) => quiz.id !== id));
    toast({
      title: "Quiz eliminato",
      description: "Il quiz è stato rimosso dalla cronologia.",
    });
  };

  const handleNext = () => {
    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleExit = () => {
    setIsPlaying(false);
    setShowResults(false);
  };

  if (showResults) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const wrongAnswers = answers
      .map((a, i) => ({
        question: activeQuestions[i].question,
        yourAnswer: activeQuestions[i].options[a.selectedIndex],
        correctAnswer: activeQuestions[i].options[activeQuestions[i].correctAnswer],
        isCorrect: a.isCorrect,
      }))
      .filter((a) => !a.isCorrect);

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <QuizResults
          totalQuestions={activeQuestions.length}
          correctAnswers={correctCount}
          timeSpent={timeSpent}
          wrongAnswers={wrongAnswers}
          onRetry={() => handleStartQuiz()} 
          onHome={handleExit}
        />
      </div>
    );
  }

  if (isPlaying) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            data-testid="button-exit-quiz"
          >
            <X className="h-4 w-4 mr-2" />
            Esci
          </Button>
          <span className="text-sm font-medium">Quiz in corso</span>
          <div className="w-20" />
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <QuizQuestion
            questionNumber={currentQuestion + 1}
            totalQuestions={activeQuestions.length}
            question={activeQuestions[currentQuestion].question}
            options={activeQuestions[currentQuestion].options}
            correctAnswer={activeQuestions[currentQuestion].correctAnswer}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">Quiz</h1>
          <p className="text-muted-foreground mt-1">
            Metti alla prova le tue conoscenze
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. SEZIONE QUIZ AI INTEGRATO (FEATURED) */}
        <Card className="col-span-full bg-gradient-to-r from-primary/10 via-purple-500/5 to-primary/10 border-primary/20 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bot className="h-32 w-32" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="bg-primary hover:bg-primary/90">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by CAPITALE PERSONALE
              </Badge>
            </div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Quiz AI Personalizzato
            </CardTitle>
            <CardDescription className="text-base max-w-2xl">
              Generato automaticamente dai tuoi highlights, note e capitoli di studio.
              Il modo più efficace per consolidare ciò che hai appena studiato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  100% Personalizzato
                </h4>
                <p className="text-xs text-muted-foreground">Basato esclusivamente sul tuo materiale di studio</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Adaptive Learning
                </h4>
                <p className="text-xs text-muted-foreground">Si adatta alle tue lacune e difficoltà</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Stats Avanzate
                </h4>
                <p className="text-xs text-muted-foreground">127 quiz generati | 85% accuracy</p>
              </div>
            </div>
            
            <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full md:w-auto font-semibold shadow-md">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Genera il Tuo Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0">
                <DialogTitle className="sr-only">Carica materiale per quiz</DialogTitle>
                <DialogDescription className="sr-only">
                  Carica un file PDF per generare automaticamente un quiz personalizzato.
                </DialogDescription>
                <UploadMaterial
                  onUpload={handleGenerateQuiz}
                  onCancel={() => setIsGeneratorOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* 2. SEZIONE RISORSE ESTERNE CONSIGLIATE */}
        <div className="col-span-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Risorse Quiz Consigliate
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Abbiamo selezionato i migliori generatori di quiz online per integrare la tua preparazione con banche dati ufficiali.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Concorsando */}
            <a 
              href="https://www.concorsando.it/blog/simulatore-quiz-concorsando/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block h-full"
            >
              <Card className="h-full border-dashed border-2 hover:border-blue-500 hover:shadow-md transition-all bg-slate-50 dark:bg-slate-900/50">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-xl text-blue-600 dark:text-blue-400">
                      C
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">Consigliato</Badge>
                      <Badge variant="outline" className="text-xs">Esterno</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-blue-600 transition-colors flex items-center gap-2">
                    Concorsando.it
                    <ExternalLink className="h-4 w-4 opacity-50" />
                  </CardTitle>
                  <CardDescription>Simulatore e banca dati PA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>150.000+ quiz da banche dati ministeriali</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>Specializzato in: RIPAM, Ministeri, PA</span>
                    </li>
                  </ul>
                  <div className="bg-white dark:bg-slate-950 p-3 rounded border text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">💡 Quando usarlo:</span> verifica su banche dati ufficiali post-studio.
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    ⚠️ Risorsa esterna - non affiliata
                  </p>
                </CardFooter>
              </Card>
            </a>

            {/* Card Mininterno */}
            <a 
              href="https://www.mininterno.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block h-full"
            >
              <Card className="h-full border-dashed border-2 hover:border-green-500 hover:shadow-md transition-all bg-slate-50 dark:bg-slate-900/50">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-bold text-xl text-green-600 dark:text-green-400">
                      M
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Consigliato</Badge>
                      <Badge variant="outline" className="text-xs">Esterno</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-green-600 transition-colors flex items-center gap-2">
                    Mininterno.net
                    <ExternalLink className="h-4 w-4 opacity-50" />
                  </CardTitle>
                  <CardDescription>Specialista Forze Armate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">•</span>
                      <span>50.000+ quiz per Forze Armate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">•</span>
                      <span>Specializzato in: Polizia, Carabinieri, VVF</span>
                    </li>
                  </ul>
                  <div className="bg-white dark:bg-slate-950 p-3 rounded border text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">💡 Quando usarlo:</span> test TPC e prove concorsuali FF.AA.
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    ⚠️ Risorsa esterna - non affiliata
                  </p>
                </CardFooter>
              </Card>
            </a>
          </div>
        </div>

        {/* 3. LISTA QUIZ UTENTE (MOCK) */}
        <div className="col-span-full mt-4">
          <h2 className="text-xl font-bold mb-4">I Tuoi Quiz Recenti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover-elevate" data-testid={`quiz-card-${quiz.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {quiz.questionsCount} domande - {quiz.difficulty}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {quiz.lastScore !== null && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Ultimo punteggio:{" "}
                      <span
                        className={`font-medium ${
                          quiz.lastScore >= 80
                            ? "text-status-online dark:text-status-online"
                            : quiz.lastScore >= 60
                            ? "text-secondary dark:text-secondary"
                            : "text-destructive dark:text-destructive"
                        }`}
                      >
                        {quiz.lastScore}%
                      </span>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleStartQuiz(quiz.id)}
                      data-testid={`button-start-quiz-${quiz.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Inizia Quiz
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      data-testid={`button-delete-quiz-${quiz.id}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 4. SEZIONE COLLABORAZIONI FUTURE */}
        <Card className="col-span-full border-dashed border-2 border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10 mt-8">
          <CardContent className="flex flex-col md:flex-row items-center gap-6 p-8">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full shrink-0">
              <Handshake className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-lg font-bold">Sei Concorsando.it o Mininterno.it?</h3>
              <p className="text-muted-foreground max-w-2xl">
                Siamo interessati a creare integrazioni native e partnership strategiche per offrire un'esperienza ancora migliore ai nostri utenti.
                Immaginiamo sincronizzazione risultati, dashboard unificata e API integration.
              </p>
            </div>
            <Button variant="outline" className="shrink-0 gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20">
              <Mail className="h-4 w-4" />
              Proponi una Collaborazione
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
