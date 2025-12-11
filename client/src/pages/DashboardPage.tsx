import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/StatsCard";
import { ProgressBar } from "@/components/ProgressBar";
import { PhaseProgress, defaultPhases } from "@/components/PhaseProgress";
import { ConfigurazioneConcorso } from "@/components/ConfigurazioneConcorso";
import { ProgressioneGenerale, defaultFasiProgress } from "@/components/ProgressioneGenerale";
import { FlashcardGenerator } from "@/components/FlashcardGenerator";
import { BibliotecaNormativa } from "@/components/BibliotecaNormativa";
import { AITutorCheckpoint } from "@/components/AITutorCheckpoint";
import {
  BookOpen,
  Layers,
  Flame,
  Trophy,
  ArrowRight,
  Clock,
  Rocket,
  Target,
  Brain,
  Sparkles,
  Calendar,
  Battery,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPhase] = useState(1);
  const [phases] = useState(defaultPhases);
  const [hasCompletedPhase1] = useState(false);
  const [concorso] = useState<{
    nome: string;
    categoria?: string;
    dataEsame?: Date | null;
    giorniDisponibili?: number;
    oreSettimanali?: number;
    bancaDatiDisponibile?: boolean;
    penalitaErrori?: number | null;
  } | undefined>(undefined);

  const livelloGlobale = 5;
  const giorniAlConcorso = concorso?.giorniDisponibili;

  const handlePhaseClick = (phaseId: number) => {
    if (phaseId === 1) {
      setLocation("/phase1");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header con stats principali */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-welcome">
            Bentornato, {user?.name?.split(" ")[0] || "Studente"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Protocollo C.P.A. 2.0 - Preparazione Concorsi
          </p>
        </div>
        <div className="flex items-center gap-4">
          {giorniAlConcorso && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold" data-testid="text-giorni-concorso">
                {giorniAlConcorso} giorni
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
            <Battery className="h-4 w-4 text-primary" />
            <span className="font-semibold" data-testid="text-livello">
              Livello: {livelloGlobale}%
            </span>
          </div>
        </div>
      </div>

      {/* Banner fase corrente */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary rounded-lg">
                <Rocket className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  FASE {currentPhase}: {phases[currentPhase - 1].title}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {phases[currentPhase - 1].description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <ProgressBar value={livelloGlobale} size="sm" showPercentage={false} />
                  <span className="text-sm font-medium">{livelloGlobale}%</span>
                </div>
              </div>
            </div>
            <Link href="/phase1">
              <Button size="lg" data-testid="button-continue-phase">
                {hasCompletedPhase1 ? "Continua" : "Inizia Setup"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Fase Attuale"
          value={`${currentPhase}/4`}
          subtitle={phases[currentPhase - 1].title}
          icon={Target}
        />
        <StatsCard
          title="Progresso Globale"
          value={`${livelloGlobale}%`}
          subtitle="Completamento totale"
          icon={Layers}
        />
        <StatsCard
          title="Serie Attiva"
          value="0 giorni"
          subtitle="Inizia oggi!"
          icon={Flame}
        />
        <StatsCard
          title="Livello"
          value={user?.level || 0}
          icon={Trophy}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progressione Generale */}
          <ProgressioneGenerale
            livelloGlobale={livelloGlobale}
            giorniAlConcorso={giorniAlConcorso}
            fasi={defaultFasiProgress}
          />

          {/* Call to action per fase 1 */}
          {!hasCompletedPhase1 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Sparkles className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Inizia dalla Fase 1: Intelligence & Setup</h3>
                    <p className="text-muted-foreground mt-1">
                      Carica il bando del tuo concorso per far analizzare all'AI tutte 
                      le informazioni necessarie. Questo e il primo passo fondamentale per 
                      sbloccare tutte le altre fasi.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Verifica dei requisiti bloccanti (STOP se non idoneo)
                      </li>
                      <li className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Analisi automatica delle prove e tassonomia materie
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Generazione del calendario inverso personalizzato
                      </li>
                      <li className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Sblocco Fase 0.5: Fondamenta AI
                      </li>
                    </ul>
                    <Link href="/phase1">
                      <Button className="mt-4" data-testid="button-start-phase1">
                        Carica il Bando
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metodo delle fasi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Il Metodo delle 4 Fasi + Fondamenta AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseProgress
                phases={phases}
                onPhaseClick={handlePhaseClick}
              />
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Formula del Sistema:</span>{" "}
                  SUCCESSO = Intelligence + Fondamenta AI + Acquisizione + Consolidamento SRS + Drill AI + Simulazione
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Obiettivi settimanali (solo dopo fase 1) */}
          {hasCompletedPhase1 && (
            <Card>
              <CardHeader>
                <CardTitle>Obiettivi Settimanali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressBar value={0} label="Flashcard Ripassate (0/200)" />
                <ProgressBar value={0} label="Quiz Completati (0/10)" />
                <ProgressBar value={0} label="Ore di Studio (0/10)" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar destra */}
        <div className="space-y-6">
          {/* Configurazione Concorso */}
          <ConfigurazioneConcorso concorso={concorso} />

          {/* Flashcard Generator (disabilitato fino a fase 1) */}
          <FlashcardGenerator
            disabled={!hasCompletedPhase1}
            stats={{ totali: 0, daRipassareOggi: 0, masterate: 0, inApprendimento: 0 }}
          />

          {/* Biblioteca Normativa (disabilitato fino a fase 1) */}
          <BibliotecaNormativa
            disabled={!hasCompletedPhase1}
            normative={[]}
          />

          {/* Azioni Rapide */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/phase1" className="block">
                <Button variant="secondary" className="w-full justify-start" data-testid="button-action-bando">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Carica Bando
                </Button>
              </Link>
              <Link href="/materials" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasCompletedPhase1}
                  data-testid="button-action-materiali"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Gestisci Materiali
                </Button>
              </Link>
              <Link href="/flashcards" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasCompletedPhase1}
                  data-testid="button-action-flashcards"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Ripassa Flashcard
                </Button>
              </Link>
              <Link href="/quiz" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasCompletedPhase1}
                  data-testid="button-action-quiz"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Quiz AI
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Regole Auree */}
          <Card>
            <CardHeader>
              <CardTitle>Regole Auree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Non studiare senza piano</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Prima decodifica il bando, poi studia.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Fasi propedeutiche</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Ogni fase sblocca la successiva.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">7 giorni di tapering</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Scarico cognitivo prima dell'esame.
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Fondamenta prima di tutto</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Costruisci lo scheletro concettuale con l'AI Tutor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
