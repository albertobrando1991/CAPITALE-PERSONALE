import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Music, BookOpen } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Per ora usiamo dati mockati se l'endpoint non esiste ancora
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) return res.json();
      } catch (e) {
        console.warn("API admin stats non disponibile, uso mock");
      }
      return {
        totalUsers: 1,
        premiumUsers: 1,
        totalPodcasts: 5,
        pendingRequests: 0
      };
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-8 h-8 text-yellow-500" />
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utenti Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
            <Badge variant="secondary" className="mt-2">
              <Users className="w-3 h-3 mr-1" /> Attivi
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utenti Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.premiumUsers || 0}</div>
            <Badge className="mt-2 bg-gradient-to-r from-purple-500 to-pink-600">
              ✨ Premium
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Podcast Caricati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalPodcasts || 0}</div>
            <Badge variant="outline" className="mt-2">
              <Music className="w-3 h-3 mr-1" /> Disponibili
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Richieste Podcast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingRequests || 0}</div>
            <Badge variant="secondary" className="mt-2">
              ⏳ In Attesa
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle>📤 Carica Podcast</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Carica nuovi podcast per la banca dati
            </p>
            <Badge variant="outline">
              <BookOpen className="w-3 h-3 mr-1" /> Upload Panel
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle>📝 Gestisci Richieste</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Gestisci richieste podcast custom degli utenti
            </p>
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" /> Request Panel
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
