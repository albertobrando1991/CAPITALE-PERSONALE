import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { MaterialCard } from "@/components/MaterialCard";
import { ProgressBar } from "@/components/ProgressBar";
import {
  BookOpen,
  Layers,
  Flame,
  Trophy,
  ArrowRight,
  Clock,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// todo: remove mock functionality
const mockMaterials = [
  {
    id: "1",
    title: "Legge 241/1990",
    type: "normativa" as const,
    status: "completed" as const,
    flashcardsCount: 45,
    quizzesCount: 3,
  },
  {
    id: "2",
    title: "D.Lgs. 165/2001 - TUPI",
    type: "normativa" as const,
    status: "completed" as const,
    flashcardsCount: 62,
    quizzesCount: 4,
  },
  {
    id: "3",
    title: "Costituzione Italiana",
    type: "normativa" as const,
    status: "processing" as const,
    flashcardsCount: 0,
    quizzesCount: 0,
  },
];

// todo: remove mock functionality
const mockUpcomingReviews = [
  { id: "1", front: "Chi nomina il Responsabile del Procedimento?", dueIn: "2 ore" },
  { id: "2", front: "Cos'e la SCIA?", dueIn: "4 ore" },
  { id: "3", front: "Termine massimo procedimento?", dueIn: "Domani" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [materials] = useState(mockMaterials);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            Bentornato, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Continua la tua preparazione al concorso
          </p>
        </div>
        <Link href="/materials">
          <Button data-testid="button-add-material">
            <Plus className="h-4 w-4 mr-2" />
            Carica Materiale
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Materiali"
          value={12}
          subtitle="3 in elaborazione"
          icon={BookOpen}
        />
        <StatsCard
          title="Flashcard da Ripassare"
          value={28}
          subtitle="Oggi"
          icon={Layers}
          trend={{ value: 12, isPositive: false }}
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
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Materiali Recenti</CardTitle>
              <Link href="/materials">
                <Button variant="ghost" size="sm">
                  Vedi tutti
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.slice(0, 4).map((material) => (
                  <MaterialCard
                    key={material.id}
                    {...material}
                    onView={(id) => console.log("View:", id)}
                    onDelete={(id) => console.log("Delete:", id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

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
        </div>

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Azione Rapida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/flashcards" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Layers className="h-4 w-4 mr-2" />
                  Ripassa Flashcard
                </Button>
              </Link>
              <Link href="/quiz" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Inizia Quiz
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
