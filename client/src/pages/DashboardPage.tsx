import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { ProgressBar } from "@/components/ProgressBar";
import { PhaseProgress, defaultPhases } from "@/components/PhaseProgress";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

// todo: remove mock functionality
const mockUpcomingReviews = [
  { id: "1", front: "Chi nomina il Responsabile del Procedimento?", dueIn: "2 ore" },
  { id: "2", front: "Cos'e la SCIA?", dueIn: "4 ore" },
  { id: "3", front: "Termine massimo procedimento?", dueIn: "Domani" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPhase] = useState(1);
  const [phases] = useState(defaultPhases);
  const [hasCompletedPhase1] = useState(false);

  const overallProgress = 5;

  const handlePhaseClick = (phaseId: number) => {
    if (phaseId === 1) {
      setLocation("/phase1");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Bentornato, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Protocollo C.P.A. 2.0 - Preparazione Concorsi
          </p>
        </div>
      </div>

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
                  <ProgressBar value={overallProgress} size="sm" showPercentage={false} />
                  <span className="text-sm font-medium">{overallProgress}%</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Fase Attuale"
          value={`${currentPhase}/4`}
          subtitle={phases[currentPhase - 1].title}
          icon={Target}
        />
        <StatsCard
          title="Progresso Globale"
          value={`${overallProgress}%`}
          subtitle="Completamento totale"
          icon={Layers}
        />
        <StatsCard
          title="Serie Attiva"
          value="7 giorni"
          subtitle="Record: 14 giorni"
          icon={Flame}
        />
        <StatsCard
          title="Livello"
          value={user?.level || 0}
          icon={Trophy}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Il Metodo delle 4 Fasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhaseProgress
                currentPhase={currentPhase}
                phases={phases}
                onPhaseClick={handlePhaseClick}
              />
            </CardContent>
          </Card>

          {hasCompletedPhase1 && (
            <Card>
              <CardHeader>
                <CardTitle>Obiettivi Settimanali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressBar value={75} label="Flashcard Ripassate (150/200)" />
                <ProgressBar value={40} label="Quiz Completati (4/10)" />
                <ProgressBar value={90} label="Ore di Studio (9/10)" />
              </CardContent>
            </Card>
          )}

          {!hasCompletedPhase1 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Sparkles className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Inizia dalla Fase 1</h3>
                    <p className="text-muted-foreground mt-1">
                      Carica il bando del tuo concorso per far analizzare all'AI tutte 
                      le informazioni necessarie: requisiti, materie, date e passaggi 
                      per l'iscrizione. Questo e il primo passo fondamentale.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Verifica dei requisiti bloccanti
                      </li>
                      <li className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Analisi automatica delle prove e materie
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Generazione del calendario inverso
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
        </div>

        <div className="space-y-6">
          {hasCompletedPhase1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Prossime Revisioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockUpcomingReviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-3 bg-muted rounded-lg space-y-1"
                      data-testid={`review-${review.id}`}
                    >
                      <p className="text-sm font-medium line-clamp-2">
                        {review.front}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scade tra: {review.dueIn}
                      </p>
                    </div>
                  ))}
                </div>
                <Link href="/flashcards">
                  <Button variant="outline" className="w-full mt-4">
                    Inizia Ripasso
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/phase1" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Carica Bando
                </Button>
              </Link>
              <Link href="/materials" className="block">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={!hasCompletedPhase1}
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
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Ripassa Flashcard
                </Button>
              </Link>
            </CardContent>
          </Card>

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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
