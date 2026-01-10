import { Logo } from "@/components/Logo";

export function HomeFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center mb-8">
          <Logo className="w-32 h-32" />
        </div>
        <div className="flex justify-center gap-6 mb-8 text-sm">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Termini</a>
          <a href="#" className="hover:text-white transition-colors">Contatti</a>
        </div>
        <div className="text-xs">
          © {new Date().getFullYear()} Capitale Personale. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
}
