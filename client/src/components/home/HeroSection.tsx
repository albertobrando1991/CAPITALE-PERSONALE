import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="w-full py-24 md:py-32 lg:py-48 bg-primary flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Elemento Chiave: Linea sottile Oro */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center space-y-8">
          
          {/* Titolo: Voce Umana (Serif, Emotivo) */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-primary-foreground max-w-5xl leading-tight">
            <span className="italic">"La disciplina</span> batte la motivazione."
          </h1>

          {/* Separatore Oro - Elemento Layout 1 */}
          <div className="w-24 h-[2px] bg-secondary my-4"></div>

          {/* Sottotitolo: Voce Razionale (Sans, Tecnico) */}
          <div className="mx-auto max-w-[900px] space-y-6 text-primary-foreground/90 font-sans font-light tracking-wide">
            <p className="md:text-xl font-medium">
              Protocollo Avanzato di Ingegneria dell'Apprendimento: l'architettura definitiva progettata per trasformare la preparazione ai concorsi pubblici da uno sforzo caotico in un processo scientifico ad alte prestazioni.
            </p>
            
            <p className="md:text-lg text-primary-foreground/70 hidden md:block">
              In un panorama occupazionale dove non è più sufficiente "sapere", ma occorre dimostrare competenze trasversali e agilità cognitiva, questo sistema operativo per l'apprendimento azzera l'inefficacia del metodo tradizionale mnemonico.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 rounded-none bg-secondary text-primary hover:bg-secondary/90 font-sans font-semibold tracking-wider uppercase text-sm">
                Inizia il Percorso
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-none border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-white font-sans font-medium tracking-wider uppercase text-sm">
                Accedi
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Background decoration (optional subtle overlay) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none"></div>
    </section>
  );
}
