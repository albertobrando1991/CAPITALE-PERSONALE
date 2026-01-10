import { Check } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      title: "Ordine Mentale",
      description: "Il sistema organizza ogni concetto in una struttura logica. Mai più confusione."
    },
    {
      title: "Continuità Operativa",
      description: "Riprendi esattamente da dove hai lasciato. Il sistema traccia ogni sessione."
    },
    {
      title: "Efficienza Temporale",
      description: "Ottimizza il tempo di studio focalizzandoti solo su ciò che non sai."
    },
    {
      title: "Controllo Totale",
      description: "Dashboard analitiche ti mostrano la realtà della tua preparazione."
    }
  ];

  return (
    <section className="w-full py-20 md:py-32 bg-muted/30">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary leading-tight">
              Perché scegliere <br />
              <span className="italic text-primary/80">Capitale Personale</span>?
            </h2>
            <div className="w-16 h-1 bg-secondary"></div>
            <p className="text-muted-foreground md:text-lg font-sans font-light leading-relaxed">
              Abbiamo eliminato il superfluo. Abbiamo progettato ogni funzionalità pensando 
              alle reali necessità di chi deve performare ad alto livello.
            </p>
          </div>
          
          <div className="grid gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 items-start group">
                <div className="mt-1 bg-primary text-secondary p-1 shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-primary group-hover:text-secondary transition-colors">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground font-sans text-sm mt-1 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
