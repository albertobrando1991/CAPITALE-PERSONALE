import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function MyPodcastRequestsPage() {
  const [, setLocation] = useLocation();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-podcast-requests'],
    queryFn: async () => {
      const res = await fetch('/api/podcast/my-requests');
      if (!res.ok) throw new Error('Errore caricamento richieste');
      return res.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In Attesa</Badge>;
      case 'in_progress':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> In Produzione</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Completato</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rifiutato</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => window.history.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
      </Button>

      <h1 className="text-3xl font-bold mb-6">📝 Le Mie Richieste Podcast</h1>

      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      )}

      {!isLoading && requests?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Non hai ancora fatto richieste</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {requests?.map((req: any) => (
          <Card key={req.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{req.argomento}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Materia: {req.materia}
                  </p>
                </div>
                {getStatusBadge(req.status)}
              </div>
            </CardHeader>
            <CardContent>
              {req.descrizione && (
                <p className="text-sm text-muted-foreground mb-3">{req.descrizione}</p>
              )}
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Richiesta il {new Date(req.createdAt).toLocaleDateString()}</span>
                {req.completedAt && (
                  <span>• Completata il {new Date(req.completedAt).toLocaleDateString()}</span>
                )}
              </div>
              {req.noteStaff && (
                <div className="mt-3 p-3 bg-secondary rounded text-sm">
                  <strong>Nota dello staff:</strong> {req.noteStaff}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
