import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./UserAvatar";
import { LevelBadge } from "./LevelBadge";
import { ProgressBar } from "./ProgressBar";
import {
  LayoutDashboard,
  BookOpen,
  Book,
  Layers,
  HelpCircle,
  BarChart3,
  Timer,
  LogOut,
  GraduationCap,
  Sparkles,
  Target,
  FileText,
  Crown,
  Calendar as CalendarIcon,
  Lightbulb,
  Wind,
  Zap
} from "lucide-react";

interface AppSidebarProps {
  userName: string;
  userLevel: number;
  onLogout?: () => void;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendario", url: "/calendar", icon: CalendarIcon },
  { title: "Fase 0: Setup", url: "/fase0-link-placeholder", icon: Sparkles },
  { title: "Fonti & Materiali", url: "/fonti-placeholder", icon: Book },
  { title: "Fase 1: SQ3R", url: "/fase1-link-placeholder", icon: BookOpen },
  { title: "Fase 2: Acquisizione", url: "/phase2", icon: Layers },
  { title: "Fase 3: Consolidamento", url: "/fase3-link-placeholder", icon: Zap },
  { title: "Fase 4: Simulazioni Esame", url: "/simulazioni", icon: Target },
  { title: "Mnemotecniche", url: "/mnemotecniche", icon: Lightbulb },
  { title: "Libreria Pubblica", url: "/libreria", icon: Book },
  { title: "Flashcard", url: "/flashcards", icon: Layers },
  { title: "Quiz", url: "/quiz", icon: HelpCircle },
  { title: "Pomodoro", url: "/pomodoro", icon: Timer },
  { title: "Benessere", url: "/benessere", icon: Wind },
  { title: "Statistiche", url: "/stats", icon: BarChart3 },
];

export function AppSidebar({ userName, userLevel, onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  
  // Fetch subscription status
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscription/status');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const isAdmin = subscription?.isAdmin;
  const isPremium = subscription?.tier === 'premium' || subscription?.tier === 'enterprise' || isAdmin;

  const { data: concorsi } = useQuery({
    queryKey: ['concorsi'],
    queryFn: async () => {
      const res = await fetch('/api/concorsi');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const pathParts = location.split('/');
  const concorsoIndex = pathParts.indexOf('concorsi');
  let activeConcorsoId = concorsoIndex !== -1 && pathParts.length > concorsoIndex + 1 
    ? pathParts[concorsoIndex + 1] 
    : 'default';

  // Smart selection: if no active concorso in URL, try to use the first available one
  if (activeConcorsoId === 'default' && concorsi && concorsi.length > 0) {
    activeConcorsoId = concorsi[0].id;
  }

  // Aggiorna l'URL della Fase 0 e Fase 1 dinamicamente
  const dynamicNavItems = navItems.map(item => {
    // Helper to determine target URL
    const getTargetUrl = (suffix: string) => {
      if (activeConcorsoId !== 'default') {
        return `/concorsi/${activeConcorsoId}${suffix}`;
      }
      return '/dashboard'; // Fallback to dashboard instead of home
    };

    if (item.title === "Fase 0: Setup") {
      return { ...item, url: getTargetUrl('/fase0') };
    }
    if (item.title === "Fonti & Materiali") {
      return { ...item, url: getTargetUrl('/setup-fonti') };
    }
    if (item.title === "Fase 1: SQ3R") {
      return { ...item, url: getTargetUrl('/fase1') };
    }
    if (item.title === "Fase 2: Acquisizione") {
      return { ...item, url: getTargetUrl('/fase2') };
    }
    // Aggiungi Fase 3
    if (item.title === "Fase 3: Consolidamento") {
      return { ...item, url: getTargetUrl('/fase3') };
    }
    // Aggiungi Fase 4
    if (item.title === "Fase 4: Simulazioni Esame") {
      return { ...item, url: getTargetUrl('/simulazioni') };
    }
    if (item.title === "Flashcard") {
      return { ...item, url: activeConcorsoId !== 'default' ? `/flashcards?concorsoId=${activeConcorsoId}` : '/flashcards' };
    }
    // Update other items that might need concorso context if applicable
    // For now keeping global items global
    return item;
  });

  // Aggiungi link Admin se utente è admin
  if (isAdmin) {
    dynamicNavItems.push({
      title: "Admin Panel",
      url: "/admin",
      icon: Crown
    });
  }

  const nextLevelXP = (userLevel + 1) * 100;
  const currentXP = userLevel * 100 * 0.65;
  const progressToNextLevel = (currentXP / nextLevelXP) * 100;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">C.P.A. 2.0</h2>
            <div className="flex items-center gap-1 mt-1">
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-secondary text-secondary">
                  ADMIN
                </Badge>
              )}
              {isPremium && !isAdmin && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary text-primary">
                  PREMIUM
                </Badge>
              )}
              {!isPremium && !isAdmin && (
                <span className="text-xs text-muted-foreground">Free Plan</span>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dynamicNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Progresso</SidebarGroupLabel>
          <SidebarGroupContent className="px-4">
            <div className="space-y-3">
              <LevelBadge level={userLevel} />
              <ProgressBar
                value={progressToNextLevel}
                label="Prossimo livello"
                size="sm"
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            {isAdmin && <p className="text-xs text-yellow-600 font-semibold">Amministratore</p>}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}