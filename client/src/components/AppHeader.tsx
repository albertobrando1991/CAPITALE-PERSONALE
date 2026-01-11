import { Droplets, Wind } from 'lucide-react';
import { useBenessere } from '@/contexts/BenessereContext';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppHeader() {
  const { stats } = useBenessere();

  return (
    <header className="flex items-center justify-between gap-4 p-3 border-b bg-background sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        
        {/* Quick Stats - Visible on larger screens */}
        {stats && (
          <div className="hidden md:flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Badge variant="outline" className="gap-2 bg-background hover:bg-muted transition-colors cursor-default">
              <Droplets className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium">
                {stats.hydration.glasses_today}/{stats.hydration.target_today}
              </span>
            </Badge>

            <Badge variant="outline" className="gap-2 bg-background hover:bg-muted transition-colors cursor-default">
              <Wind className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-medium">
                {stats.breathing.sessions_today}
              </span>
            </Badge>
          </div>
        )}
      </div>

      <ThemeToggle />
    </header>
  );
}
