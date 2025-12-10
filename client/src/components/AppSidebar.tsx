import { Link, useLocation } from "wouter";
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
import { UserAvatar } from "./UserAvatar";
import { LevelBadge } from "./LevelBadge";
import { ProgressBar } from "./ProgressBar";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  HelpCircle,
  BarChart3,
  Timer,
  LogOut,
  GraduationCap,
} from "lucide-react";

interface AppSidebarProps {
  userName: string;
  userLevel: number;
  onLogout?: () => void;
}

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Materiali", url: "/materials", icon: BookOpen },
  { title: "Flashcard", url: "/flashcards", icon: Layers },
  { title: "Quiz", url: "/quiz", icon: HelpCircle },
  { title: "Pomodoro", url: "/pomodoro", icon: Timer },
  { title: "Statistiche", url: "/stats", icon: BarChart3 },
];

export function AppSidebar({ userName, userLevel, onLogout }: AppSidebarProps) {
  const [location] = useLocation();

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
            <p className="text-xs text-muted-foreground">Preparazione Concorsi</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
