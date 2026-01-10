import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Search, GitMerge, BookOpenCheck, Trophy, HeartPulse } from "lucide-react";

export function HowItWorksSection() {
  const modules = [
    {
      icon: <Search className="h-8 w-8 text-secondary" />,
      title: "1. Analisi Strategica e Intelligence",
      description: "Impara a decodificare la Lex Specialis (il bando) per estrarre i cluster informativi critici e dominare l'ecosistema digitale del portale inPA."
    },
    {
      icon: <Brain className="h-8 w-8 text-secondary" />,
      title: "2. Architettura Neurobiologica",
      description: "Ottimizza l'hardware del tuo cervello sfruttando la Ripetizione Spaziata per annullare la curva dell'oblio e il Recupero Attivo (Active Recall)."
    },
    {
      icon: <GitMerge className="h-8 w-8 text-secondary" />,
      title: "3. Strategia Operativa",
      description: "Applica il Reverse Engineering alla tua tabella di marcia e utilizza l'Interlacciamento (Interleaving) tra le materie per eliminare l'illusione di competenza."
    },
    {
      icon: <BookOpenCheck className="h-8 w-8 text-secondary" />,
      title: "4. Il Cuore Tecnico (SQ3R+)",
      description: "Una tecnica di lettura attiva e scansione strutturata specifica per i testi giuridici e tecnici, che trasforma ogni ora di studio in valore reale."
    },
    {
      icon: <Trophy className="h-8 w-8 text-secondary" />,
      title: "5. Allenamento alla Performance",
      description: "Domina i quiz RIPAM/Formez attraverso algoritmi risolutivi dedicati, gestisci banche dati massive con il metodo dei Bin e affronta i test situazionali."
    },
    {
      icon: <HeartPulse className="h-8 w-8 text-secondary" />,
      title: "6. Ingegneria del Benessere",
      description: "Gestisci lo stress e l'ansia da prestazione con protocolli di respirazione quadrata e igiene del sonno per garantire che la tua memoria sia sempre al picco."
    }
  ];

  return (
    <section className="w-full py-20 md:py-32 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary">
              Un Sistema Integrato in 6 Moduli
            </h2>
            <div className="w-12 h-1 bg-secondary mx-auto"></div>
            <p className="max-w-[700px] text-muted-foreground md:text-lg font-sans font-light pt-4">
              Il percorso ti guiderà attraverso una trasformazione totale della tua metodologia di studio.
            </p>
          </div>
        </div>
        
        {/* Layout a griglia 3x2 per i moduli */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => (
            <Card key={index} className="border-border shadow-sm hover:shadow-md transition-shadow bg-white rounded-none border-t-4 border-t-primary hover:border-t-secondary h-full">
              <CardHeader className="flex flex-col items-start space-y-4 pb-2">
                <div className="p-3 bg-primary/5 rounded-none">
                  {module.icon}
                </div>
                <CardTitle className="text-xl font-serif font-bold text-primary leading-tight">
                  {module.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-left">
                <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
