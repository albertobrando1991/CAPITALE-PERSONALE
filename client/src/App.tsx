import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MaterialsPage from "@/pages/MaterialsPage";
import FlashcardsPage from "@/pages/FlashcardsPage";
import QuizPage from "@/pages/QuizPage";
import PomodoroPage from "@/pages/PomodoroPage";
import StatsPage from "@/pages/StatsPage";
import CalendarPage from "@/pages/CalendarPage";

import Phase2Page from "@/pages/Phase2Page";
import SimulazioneSetupPage from "@/pages/SimulazioneSetupPage";
import SimulazioneEsamePage from "@/pages/SimulazioneEsamePage";
import SimulazioneReportPage from "@/pages/SimulazioneReportPage";
import SimulazioneRivediPage from "@/pages/SimulazioneRivediPage";
import SimulazioniListPage from "@/pages/SimulazioniListPage";
import SimulazioniPage from "@/pages/SimulazioniPage";
import Fase0SetupPage from "@/pages/Fase0SetupPage";
import Fase1SQ3RPage from "@/pages/Fase1SQ3RPage";
import MateriaPage from "@/pages/MateriaPage";
import CapitoloPage from "@/pages/CapitoloPage";
import LibreriaPubblicaPage from "@/pages/LibreriaPubblicaPage";
import SetupFontiPage from "@/pages/SetupFontiPage";
import UploadDispensePage from "@/pages/UploadDispensePage";
import RisorseConsigliePage from "@/pages/RisorseConsigliePage";
import PricingPage from "@/pages/PricingPage";
import PodcastDatabasePage from "@/pages/PodcastDatabasePage";
import MyPodcastRequestsPage from "@/pages/MyPodcastRequestsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import MnemotecnichePage from "@/pages/MnemotecnichePage";
import { SpecialistaProvider } from "@/contexts/SpecialistaContext";
import { BenessereProvider } from '@/contexts/BenessereContext';
import BenessereWidget from '@/components/benessere/BenessereWidget';
import HydrationReminder from '@/components/benessere/HydrationReminder';
import BenesserePage from '@/pages/BenesserePage';

function ProtectedRoutes() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userName={user?.name || "Utente"}
          userLevel={user?.level || 0}
          onLogout={logout}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/concorsi/:concorsoId/materie/:materiaId" component={MateriaPage} />
              <Route path="/concorsi/:concorsoId/fase1" component={Fase1SQ3RPage} />
              <Route path="/dashboard" component={DashboardPage} />

              <Route path="/phase2" component={Phase2Page} />
              <Route path="/materials" component={MaterialsPage} />
              <Route path="/libreria" component={LibreriaPubblicaPage} />
              <Route path="/mnemotecniche" component={MnemotecnichePage} />
              <Route path="/benessere" component={BenesserePage} />
              <Route path="/flashcards" component={FlashcardsPage} />
              <Route path="/quiz" component={QuizPage} />
              <Route path="/simulazioni" component={SimulazioniPage} />
              <Route path="/pomodoro" component={PomodoroPage} />
              <Route path="/stats" component={StatsPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/concorsi/:id/simulazione/setup" component={SimulazioneSetupPage} />
              <Route path="/concorsi/:id/simulazione/:simId" component={SimulazioneEsamePage} />
              <Route path="/concorsi/:id/simulazione/:simId/report" component={SimulazioneReportPage} />
              <Route path="/concorsi/:id/simulazione/:simId/rivedi" component={SimulazioneRivediPage} />
              <Route path="/concorsi/:id/simulazioni" component={SimulazioniListPage} />
              <Route path="/concorsi/:concorsoId/fase0" component={Fase0SetupPage} />
              <Route path="/concorsi/:concorsoId/setup-fonti" component={SetupFontiPage} />
              <Route path="/concorsi/:concorsoId/upload-dispense" component={UploadDispensePage} />
              <Route path="/concorsi/:concorsoId/risorse-consigliate" component={RisorseConsigliePage} />
              <Route path="/pricing" component={PricingPage} />
              <Route path="/concorsi/:concorsoId/premium" component={PricingPage} />
              <Route path="/concorsi/:concorsoId/podcast" component={PodcastDatabasePage} />
              <Route path="/podcast/my-requests" component={MyPodcastRequestsPage} />
              <Route path="/concorsi/:concorsoId/fase1/capitolo/:id" component={CapitoloPage} />
              <Route path="/concorsi/:concorsoId/fase2" component={Phase2Page} />
              <Route path="/admin" component={AdminDashboard} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import HomePage from "@/pages/HomePage";

import { ErrorBoundary } from "@/components/ErrorBoundary";

import { PomodoroProvider } from '@/contexts/PomodoroContext';
import { PomodoroWidget } from '@/components/PomodoroWidget';

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  console.log("Main Router rendering. Location:", location);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BenessereProvider>
        <PomodoroProvider>
          <Switch>
          <Route path="/">
            <HomePage />
          </Route>
          <Route path="/login">
            {isAuthenticated ? <Redirect to="/dashboard" /> : <LoginPage />}
          </Route>
          <Route path="/register">
            {isAuthenticated ? <Redirect to="/dashboard" /> : <LoginPage />}
          </Route>
          <Route path="/dashboard">
            <ProtectedRoutes />
          </Route>
          <Route>
            <ProtectedRoutes />
          </Route>
        </Switch>
        
        {/* Widget Pomodoro Globale (solo se autenticato) */}
        {isAuthenticated && location !== '/pomodoro' && <PomodoroWidget />}
        {isAuthenticated && <BenessereWidget />}
        {isAuthenticated && <HydrationReminder />}
        </PomodoroProvider>
      </BenessereProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SpecialistaProvider>
            <Toaster />
            <Router />
          </SpecialistaProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
