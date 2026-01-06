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
  Crown
} from "lucide-react";

interface AppSidebarProps {
  userName: string;
  userLevel: number;
  onLogout?: () => void;
}

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Fase 0: Setup", url: "/fase0-link-placeholder", icon: Sparkles },
  { title: "Fonti & Materiali", url: "/fonti-placeholder", icon: Book },
  { title: "Fase 1: SQ3R", url: "/fase1-link-placeholder", icon: BookOpen },
  { title: "Fase 2: Acquisizione", url: "/phase2", icon: Layers },
  { title: "Libreria Pubblica", url: "/libreria", icon: Book },
  { title: "Flashcard", url: "/flashcards", icon: Layers },
  { title: "Quiz", url: "/quiz", icon: HelpCircle },
  { title: "Simulazioni", url: "/simulazioni", icon: Target },
  { title: "Pomodoro", url: "/pomodoro", icon: Timer },
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

  // Ottieni il concorsoId dall'URL se presente, altrimenti usa un placeholder
  // In un'app reale, questo dovrebbe venire da un Context o uno Store globale
  const pathParts = location.split('/');
  const concorsoIndex = pathParts.indexOf('concorsi');
  const concorsoId = concorsoIndex !== -1 && pathParts.length > concorsoIndex + 1 
    ? pathParts[concorsoIndex + 1] 
    : 'default'; // Fallback o gestione diversa se nessun concorso è selezionato

  // Aggiorna l'URL della Fase 0 e Fase 1 dinamicamente
  const dynamicNavItems = navItems.map(item => {
    if (item.title === "Fase 0: Setup") {
      // Se non c'è concorsoId valido (default), rimanda alla dashboard o gestisci
      return { ...item, url: concorsoId !== 'default' ? `/concorsi/${concorsoId}/fase0` : '/' };
    }
    if (item.title === "Fonti & Materiali") {
      return { ...item, url: concorsoId !== 'default' ? `/concorsi/${concorsoId}/setup-fonti` : '/' };
    }
    if (item.title === "Fase 1: SQ3R") {
      return { ...item, url: concorsoId !== 'default' ? `/concorsi/${concorsoId}/fase1` : '/' };
    }
    if (item.title === "Fase 2: Acquisizione") {
      return { ...item, url: concorsoId !== 'default' ? `/concorsi/${concorsoId}/fase2` : '/phase2' };
    }
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
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-yellow-500 text-yellow-500">
                  ADMIN
                </Badge>
              )}
              {isPremium && !isAdmin && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-purple-500 text-purple-500">
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