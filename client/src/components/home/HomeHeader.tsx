import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

export function HomeHeader() {
  const [, setLocation] = useLocation();

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b z-50 transition-all duration-300">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-xl text-primary cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLocation("/")}>
          <Logo className="w-14 h-14" />
          <span className="hidden md:inline-block font-serif tracking-tight text-primary">Capitale Personale</span>
        </div>
        
        <div className="flex items-center gap-4">
           <ThemeToggle />
           <div className="flex gap-2">
             <Button variant="ghost" onClick={() => setLocation("/login")}>Accedi</Button>
             <Button onClick={() => setLocation("/register")}>Registrati</Button>
           </div>
        </div>
      </div>
    </header>
  );
}
