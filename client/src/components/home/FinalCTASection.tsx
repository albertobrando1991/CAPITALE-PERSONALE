import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function FinalCTASection() {
  return (
    <section className="w-full py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Elemento Decorativo: Linea Oro */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary opacity-80"></div>
      
      <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
        <div className="flex flex-col items-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight max-w-4xl leading-tight">
            Non presentarti al concorso sperando nella fortuna.
          </h2>
          <p className="mx-auto max-w-[800px] text-primary-foreground/80 md:text-xl font-sans font-light leading-relaxed">
            Adotta un sistema dove ogni variabile è sotto il tuo controllo e trasforma la tua preparazione in un risultato professionale certo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 rounded-none bg-secondary text-primary hover:bg-secondary/90 font-sans font-bold tracking-widest uppercase shadow-lg hover:shadow-xl transition-all">
                Inizia il Percorso
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
