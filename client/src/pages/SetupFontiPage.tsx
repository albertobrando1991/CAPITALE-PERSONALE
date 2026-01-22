import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, Crown, Sparkles } from 'lucide-react';

export default function SetupFontiPage() {
  const { concorsoId } = useParams();
  const [, setLocation] = useLocation();

  const { data: concorso, isLoading } = useQuery({
    queryKey: ['concorso', concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/concorsi/${concorsoId}`);
      if (!res.ok) throw new Error('Errore caricamento concorso');
      return res.json();
    },
  });

  // 👑 Query per verificare subscription (con admin check)
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const res = await fetch('/api/subscription/status');
      if (!res.ok) return { tier: 'free', isAdmin: false };
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  const materie = concorso?.bandoAnalysis?.materie || [];
  const isPremium = subscription?.tier === 'premium' || subscription?.tier === 'enterprise' || subscription?.isAdmin;
  const isAdmin = subscription?.isAdmin;

  // Funzione per gestire accesso features premium
  const handlePremiumAccess = () => {
    if (isPremium) {
      // ✅ Accesso diretto per Premium/Admin
      console.log('✅ Accesso Premium consentito', { tier: subscription?.tier, isAdmin });
      setLocation(`/concorsi/${concorsoId}/podcast`);
    } else {
      // 🔒 Redirect a pricing per utenti free
      console.log('🔒 Utente FREE - Redirect a Pricing');
      setLocation('/pricing');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          🎓 Prepara le tue fonti di studio
        </h1>
        <p className="text-lg text-muted-foreground">
          Scegli come vuoi studiare per il concorso: <strong>{concorso?.titolo}</strong>
        </p>
        <div className="flex gap-2 mt-3">
          {materie.map((m: any, i: number) => (
            <Badge key={i} variant="secondary">{m.nome || m}</Badge>
          ))}
        </div>
      </div>

      {/* Opzioni */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Opzione A: Risorse Consigliate */}
        <Card className="hover:shadow-lg transition-all hover:border-primary cursor-pointer"
          onClick={() => setLocation(`/concorsi/${concorsoId}/risorse-consigliate`)}>
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Risorse Consigliate</CardTitle>
            <CardDescription className="text-base">
              Manuali selezionati da esperti per il tuo concorso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✅ Edises e altri editori</li>
              <li>✅ Aggiornati 2024</li>
              <li>✅ Link diretti al sito ufficiale</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" variant="outline">
              Sfoglia Catalogo →
            </Button>
          </CardFooter>
        </Card>

        {/* Opzione C: Features Premium */}
        <Card
          className="hover:shadow-lg transition-all hover:border-primary cursor-pointer relative"
          onClick={handlePremiumAccess}
        >
          {/* Badge dinamico: Admin o Premium o Upgrade */}
          {isAdmin && (
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500">
              👑 ADMIN
            </Badge>
          )}
          {!isAdmin && isPremium && (
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-600">
              ✨ PREMIUM
            </Badge>
          )}
          {!isPremium && (
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-600">
              🔒 PREMIUM
            </Badge>
          )}

          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
              {isPremium ? <Crown className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-white" />}
            </div>
            <CardTitle className="text-2xl">
              {isPremium ? 'Features Premium' : 'Passa a Premium'}
            </CardTitle>
            <CardDescription className="text-base">
              {isPremium
                ? `Accesso completo alle funzionalità avanzate${isAdmin ? ' (Admin)' : ''}`
                : 'Sblocca podcast, sintesi illimitate e assistenza'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>🎧 Banca dati podcast per materia</li>
              <li>🤖 Sintesi AI illimitate</li>
              <li>🎙️ Richieste podcast personalizzati</li>
              <li>📞 Assistenza prioritaria</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
              size="lg"
            >
              {isPremium ? 'Accedi alle Features →' : 'Scopri Premium →'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Consiglio */}
      <Alert className="mb-6">
        <AlertTitle className="text-lg">💡 Consiglio da Capitale Personale</AlertTitle>
        <AlertDescription className="text-base">
          Puoi combinare più opzioni! Ad esempio:<br />
          <strong>Carica le tue dispense</strong> (appunti personali) +
          <strong> sfoglia risorse consigliate</strong> (manuali ufficiali)
          {isPremium && <span> + <strong>ascolta i podcast</strong> (ripasso audio)</span>}.
        </AlertDescription>
      </Alert>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setLocation(`/concorsi/${concorsoId}`)}>
          ← Torna al Concorso
        </Button>
        <Button size="lg" onClick={() => setLocation(`/concorsi/${concorsoId}/fase1`)}>
          Salta e vai a Fase 1 →
        </Button>
      </div>
    </div>
  );
}