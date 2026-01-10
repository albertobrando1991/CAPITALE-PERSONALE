import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, X, Crown, Zap, Users } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "/mese",
      description: "Per iniziare a esplorare il metodo.",
      features: [
        { text: 'Upload 3 PDF', included: true },
        { text: '5 sintesi AI al mese', included: true },
        { text: 'Accesso base SQ3R', included: true },
        { text: 'Banca dati podcast', included: false },
        { text: 'Sintesi AI illimitate', included: false },
        { text: 'Assistenza personale', included: false },
      ],
      cta: "Inizia Gratis",
      ctaVariant: "outline" as const,
      highlight: false
    },
    {
      name: "Premium",
      price: "€19.90",
      period: "/mese",
      description: "Per chi vuole massimizzare i risultati.",
      features: [
        { text: 'Upload illimitati', included: true },
        { text: 'Sintesi AI illimitate', included: true },
        { text: 'Accesso completo SQ3R', included: true },
        { text: 'Banca dati podcast completa', included: true },
        { text: 'Audio recap automatici', included: true },
        { text: 'Assistenza personale', included: false },
      ],
      cta: "Passa a Premium",
      ctaVariant: "default" as const,
      highlight: true,
      badge: "Più Popolare"
    },
    {
      name: "Enterprise",
      price: "€49.90",
      period: "/mese",
      description: "Supporto totale e personalizzato.",
      features: [
        { text: 'Tutto Premium +', included: true },
        { text: 'Assistenza 1:1 prioritaria', included: true },
        { text: 'Podcast personalizzati', included: true },
        { text: 'Mappe mentali custom', included: true },
        { text: 'Piano di studio personalizzato', included: true },
        { text: 'Call mensile con tutor', included: true },
      ],
      cta: "Contattaci",
      ctaVariant: "outline" as const,
      highlight: false
    }
  ];

  return (
    <section className="w-full py-20 md:py-32 bg-muted/30" id="pricing">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary">
              Piani di Abbonamento
            </h2>
            <div className="w-12 h-1 bg-secondary mx-auto"></div>
            <p className="max-w-[700px] text-muted-foreground md:text-lg font-sans font-light pt-4">
              Investi nella tua preparazione con strumenti professionali.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative flex flex-col rounded-none border-t-4 ${
                plan.highlight 
                  ? "border-t-secondary shadow-lg scale-105 z-10 border-x-primary/10 border-b-primary/10" 
                  : "border-t-primary border-border shadow-sm hover:shadow-md"
              } bg-white transition-all duration-300`}
            >
              {plan.highlight && plan.badge && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-secondary text-primary hover:bg-secondary/90 px-4 py-1.5 rounded-full font-sans font-bold uppercase text-xs tracking-wider">
                    <Crown className="w-3 h-3 mr-1" /> {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-serif font-bold text-primary">
                  {plan.name}
                </CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted-foreground font-sans font-light">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground font-sans mt-2">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="flex-1 pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-secondary shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={`font-sans ${feature.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6 pb-8">
                <Link href={plan.name === "Enterprise" ? "mailto:info@capitalepersonale.com" : "/register"} className="w-full">
                  <Button 
                    className={`w-full rounded-none h-12 font-sans font-semibold tracking-wide uppercase ${
                      plan.highlight 
                        ? "bg-primary text-secondary hover:bg-primary/90" 
                        : "border-primary text-primary hover:bg-primary/5"
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
