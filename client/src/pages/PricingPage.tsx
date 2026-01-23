import { useLocation } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Users, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const [, setLocation] = useLocation();

  const features = {
    free: [
      { text: 'Upload 3 PDF', included: true },
      { text: '5 sintesi AI al mese', included: true },
      { text: 'Accesso base SQ3R', included: true },
      { text: 'Banca dati podcast', included: false },
      { text: 'Sintesi AI illimitate', included: false },
      { text: 'Richieste podcast custom', included: false },
      { text: 'Assistenza personale', included: false },
    ],
    premium: [
      { text: 'Upload illimitati', included: true },
      { text: 'Sintesi AI illimitate', included: true },
      { text: 'Accesso completo SQ3R', included: true },
      { text: 'Banca dati podcast completa', included: true },
      { text: 'Audio recap automatici', included: true },
      { text: 'Richieste podcast custom', included: true },
      { text: 'Export PDF/Notion', included: true },
      { text: 'Assistenza personale', included: false },
    ],
    enterprise: [
      { text: 'Tutto Premium +', included: true },
      { text: 'Assistenza 1:1 prioritaria', included: true },
      { text: 'Podcast personalizzati', included: true },
      { text: 'Mappe mentali custom', included: true },
      { text: 'Piano di studio personalizzato', included: true },
      { text: 'Call mensile con tutor', included: true },
      { text: 'Accesso anticipato nuove feature', included: true },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Supera il tuo concorso con Capitale Personale
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Strumenti AI avanzati, podcast educativi e assistenza personale per la tua preparazione
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* FREE */}
          <Card className="relative">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">Gratuito</Badge>
              <CardTitle className="text-3xl">Free</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-muted-foreground">/mese</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.free.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" size="lg" onClick={() => setLocation('/dashboard')}>
                Inizia Gratis
              </Button>
            </CardFooter>
          </Card>

          {/* PREMIUM */}
          <Card className="relative border-primary shadow-2xl scale-105">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-1.5">
                <Crown className="w-3 h-3 mr-1" /> Più Popolare
              </Badge>
            </div>
            <CardHeader>
              <Badge className="w-fit mb-2 bg-gradient-to-r from-purple-500 to-pink-600">
                Premium
              </Badge>
              <CardTitle className="text-3xl">Premium</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">€19.90</span>
                <span className="text-muted-foreground">/mese</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.premium.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'font-medium' : 'text-muted-foreground'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                size="lg"
                onClick={() => {
                  // TODO: Integrazione Stripe/PayPal
                  alert('🚧 Pagamento in arrivo! Per ora simulato.');
                }}
              >
                <Zap className="w-4 h-4 mr-2" /> Passa a Premium
              </Button>
            </CardFooter>
          </Card>

          {/* ENTERPRISE */}
          <Card className="relative">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-gradient-to-r from-orange-500 to-red-600">
                Enterprise
              </Badge>
              <CardTitle className="text-3xl">Enterprise</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">€49.90</span>
                <span className="text-muted-foreground">/mese</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.enterprise.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                size="lg"
                onClick={() => {
                  window.location.href = 'mailto:albertobrando1991@gmail.com?subject=Richiesta Enterprise Plan';
                }}
              >
                <Users className="w-4 h-4 mr-2" /> Contattaci
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="max-w-3xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">❓ Domande Frequenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Posso cambiare piano in qualsiasi momento?</h4>
              <p className="text-sm text-muted-foreground">
                Sì, puoi fare upgrade o downgrade in qualsiasi momento. Il cambio sarà effettivo dal prossimo ciclo di fatturazione.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Come funzionano i podcast custom?</h4>
              <p className="text-sm text-muted-foreground">
                Utenti Premium possono richiedere podcast su argomenti specifici. Il nostro team li produrrà entro 3-5 giorni lavorativi.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Cosa include l'assistenza personale Enterprise?</h4>
              <p className="text-sm text-muted-foreground">
                Call mensile 1:1 con tutor esperto, piano di studio personalizzato, priorità nelle richieste e accesso a feature beta.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Come funziona il piano gratuito?</h4>
              <p className="text-sm text-muted-foreground">
                Il piano Free include 3 upload PDF, 5 sintesi AI al mese e accesso base al metodo SQ3R. Perfetto per testare la piattaforma.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Final */}
        <div className="text-center">
          <Button size="lg" variant="outline" onClick={() => setLocation('/dashboard')}>
            Vai alla Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
