import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Users,
  Headphones,
  MessageSquare,
  Upload,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Plus,
  Edit,
  Shield
} from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestFilter, setRequestFilter] = useState<string>('all');

  // Action Dialog State
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionRequest, setActionRequest] = useState<any>(null);
  const [actionNote, setActionNote] = useState('');

  // ============================================
  // QUERIES
  // ============================================

  // Fetch Admin Stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch Podcasts
  const { data: podcasts, isLoading: loadingPodcasts } = useQuery({
    queryKey: ['/api/admin/podcast'],
  });

  // Fetch Requests
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['/api/admin/requests', requestFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/requests?status=${requestFilter}`);
      if (!res.ok) throw new Error('Errore caricamento richieste');
      return res.json();
    },
  });

  // Fetch Staff
  const { data: staff, isLoading: loadingStaff } = useQuery({
    queryKey: ['/api/admin/staff'],
  });

  // ============================================
  // MUTATIONS
  // ============================================

  // Upload Podcast Mutation
  const uploadPodcastMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/admin/podcast/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore upload');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/podcast'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "✅ Podcast caricato",
        description: "Il podcast è stato caricato con successo",
      });
      setUploadDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message || "Errore durante l'upload del podcast",
        variant: "destructive",
      });
    },
  });

  // Delete Podcast Mutation
  const deletePodcastMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/podcast/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/podcast'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "✅ Podcast eliminato",
        description: "Il podcast è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Errore durante l'eliminazione",
        variant: "destructive",
      });
    },
  });

  // Update Request Status Mutation
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, noteStaff }: { id: string; status: string; noteStaff?: string }) => {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, noteStaff }),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "✅ Richiesta aggiornata",
        description: "Lo stato della richiesta è stato aggiornato",
      });
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  // Add Staff Mutation
  const addStaffMutation = useMutation({
    mutationFn: async (data: { email: string; nome: string; ruolo: string }) => {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore aggiunta staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff'] });
      toast({
        title: "✅ Staff aggiunto",
        description: "Il membro dello staff è stato aggiunto con successo",
      });
      setStaffDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete Staff Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/staff'] });
      toast({
        title: "✅ Staff rimosso",
        description: "Il membro dello staff è stato rimosso",
      });
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Errore durante la rimozione",
        variant: "destructive",
      });
    },
  });

  // ============================================
  // HANDLERS
  // ============================================

  // Upload Form Handler
  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadPodcastMutation.mutate(formData);
  };

  // Add Staff Form Handler
  const handleAddStaffSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addStaffMutation.mutate({
      email: formData.get('email') as string,
      nome: formData.get('nome') as string,
      ruolo: formData.get('ruolo') as string,
    });
  };

  const isLoading = loadingStats || loadingPodcasts || loadingRequests || loadingStaff;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-yellow-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Panel
              </h1>
            </div>
            <p className="text-gray-600">Gestione completa della piattaforma</p>
          </div>
          <Badge variant="outline" className="bg-yellow-100 border-yellow-400 text-yellow-700">
            <Crown className="w-4 h-4 mr-1" />
            Amministratore
          </Badge>
        </div>

        {/* ============================================ */}
        {/* STATS CARDS */}
        {/* ============================================ */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Podcast Totali
              </CardTitle>
              <Headphones className="w-5 h-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.podcasts?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Richieste Pending
              </CardTitle>
              <Clock className="w-5 h-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.requests?.pending || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                di {stats?.requests?.total || 0} totali
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Utenti Premium
              </CardTitle>
              <Users className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.users?.premium || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                di {stats?.users?.total || 0} totali
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Membri Staff
              </CardTitle>
              <Shield className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{staff?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================ */}
        {/* TABS */}
        {/* ============================================ */}
        <Tabs defaultValue="podcasts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="podcasts">
              <Headphones className="w-4 h-4 mr-2" />
              Podcast
            </TabsTrigger>
            <TabsTrigger value="requests">
              <MessageSquare className="w-4 h-4 mr-2" />
              Richieste ({stats?.requests?.pending || 0})
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Shield className="w-4 h-4 mr-2" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* TAB: PODCAST MANAGEMENT */}
          {/* ============================================ */}
          <TabsContent value="podcasts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestione Podcast</CardTitle>
                    <CardDescription>
                      Carica, modifica ed elimina podcast dalla banca dati
                    </CardDescription>
                  </div>
                  <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
                    setUploadDialogOpen(open);
                    if (!open) setSelectedRequest(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-500 hover:bg-purple-600">
                        <Upload className="w-4 h-4 mr-2" />
                        Carica Podcast
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        if (selectedRequest) {
                          formData.append('requestId', selectedRequest.id);
                        }
                        uploadPodcastMutation.mutate(formData);
                      }}>
                        <DialogHeader>
                          <DialogTitle>
                            {selectedRequest ? '📝 Carica Podcast per Richiesta' : 'Carica Nuovo Podcast'}
                          </DialogTitle>
                          <DialogDescription>
                            {selectedRequest && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2 mb-4">
                                <p className="text-sm font-semibold text-blue-900">Richiesta Utente:</p>
                                <p className="text-sm text-blue-700">Materia: {selectedRequest.materia}</p>
                                <p className="text-sm text-blue-700">Argomento: {selectedRequest.argomento}</p>
                              </div>
                            )}
                            Compila i campi per caricare un nuovo podcast nella banca dati
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="titolo">Titolo *</Label>
                            <Input
                              id="titolo"
                              name="titolo"
                              placeholder="Es: Introduzione al Diritto Amministrativo"
                              defaultValue={selectedRequest?.argomento || ''}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="descrizione">Descrizione</Label>
                            <Textarea
                              id="descrizione"
                              name="descrizione"
                              placeholder="Descrizione breve del contenuto..."
                              defaultValue={selectedRequest?.descrizione || ''}
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="materia">Materia *</Label>
                              <Select name="materia" defaultValue={selectedRequest?.materia || ''} required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona materia" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Diritto Amministrativo">Diritto Amministrativo</SelectItem>
                                  <SelectItem value="Diritto Costituzionale">Diritto Costituzionale</SelectItem>
                                  <SelectItem value="Diritto Civile">Diritto Civile</SelectItem>
                                  <SelectItem value="Contabilità Pubblica">Contabilità Pubblica</SelectItem>
                                  <SelectItem value="Diritto del Lavoro">Diritto del Lavoro</SelectItem>
                                  <SelectItem value="Economia Aziendale">Economia Aziendale</SelectItem>
                                  <SelectItem value="Informatica">Informatica</SelectItem>
                                  <SelectItem value="Lingua Inglese">Lingua Inglese</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="argomento">Argomento</Label>
                              <Input
                                id="argomento"
                                name="argomento"
                                placeholder="Es: Principi generali"
                                defaultValue={selectedRequest?.argomento || ''}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="durata">Durata (secondi)</Label>
                              <Input
                                id="durata"
                                name="durata"
                                type="number"
                                placeholder="Es: 900 (15 min)"
                              />
                            </div>
                            <div>
                              <Label htmlFor="isPremiumOnly">Premium Only?</Label>
                              <Select name="isPremiumOnly" defaultValue="true">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Sì (Premium)</SelectItem>
                                  <SelectItem value="false">No (Pubblico)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="audio">File Audio * (MP3, max 100MB)</Label>
                            <Input
                              id="audio"
                              name="audio"
                              type="file"
                              accept="audio/mpeg,audio/mp3"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="trascrizione">Trascrizione (opzionale)</Label>
                            <Textarea
                              id="trascrizione"
                              name="trascrizione"
                              placeholder="Testo completo del podcast..."
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" disabled={uploadPodcastMutation.isPending}>
                            {uploadPodcastMutation.isPending ? 'Caricamento...' : 'Carica Podcast'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Materia</TableHead>
                      <TableHead>Argomento</TableHead>
                      <TableHead>Durata</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ascolti</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {podcasts?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">
                          Nessun podcast caricato
                        </TableCell>
                      </TableRow>
                    )}
                    {podcasts?.map((podcast: any) => (
                      <TableRow key={podcast.id}>
                        <TableCell className="font-medium">{podcast.titolo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{podcast.materia}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{podcast.argomento || '-'}</TableCell>
                        <TableCell>{Math.floor(podcast.durata / 60)} min</TableCell>
                        <TableCell>
                          {podcast.isPremiumOnly ? (
                            <Badge className="bg-purple-100 text-purple-700">Premium</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Pubblico</Badge>
                          )}
                        </TableCell>
                        <TableCell>{podcast.ascoltiTotali || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Confermi eliminazione?')) {
                                deletePodcastMutation.mutate(podcast.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          {/* ============================================ */} 
          {/* TAB: RICHIESTE PODCAST UTENTI */} 
          {/* ============================================ */} 
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Richieste Podcast Custom</CardTitle>
                    <CardDescription>
                      Gestisci le richieste di podcast personalizzati degli utenti
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Filtro Stato */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600">Filtra:</Label>
                      <Select value={requestFilter} onValueChange={setRequestFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Tutte ({requests?.length || 0})
                          </SelectItem>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-500" />
                              Solo Pending
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Solo Completate
                            </div>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              Solo Rifiutate
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* NUOVO: Elimina Tutte Completate */}
                    {requests?.some((r: any) => r.status === 'completed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={async () => {
                          const completedRequests = requests.filter((r: any) => r.status === 'completed');
                          if (confirm(`Eliminare tutte le ${completedRequests.length} richieste completate?`)) {
                            try {
                              const res = await fetch('/api/admin/requests/bulk', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'completed' })
                              });
                              
                              if (!res.ok) throw new Error('Errore durante la pulizia');
                              
                              const data = await res.json();
                              
                              queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
                              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                              
                              toast({
                                title: "✅ Pulizia completata",
                                description: `${data.count} richieste eliminate`,
                              });
                            } catch (error) {
                              toast({
                                title: "❌ Errore",
                                description: "Impossibile eliminare le richieste",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Pulisci Completate
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent> 
                <Table> 
                  <TableHeader> 
                    <TableRow> 
                      <TableHead>Utente</TableHead> 
                      <TableHead>Materia</TableHead> 
                      <TableHead>Argomento</TableHead> 
                      <TableHead>Descrizione</TableHead> 
                      <TableHead>Data</TableHead> 
                      <TableHead>Stato</TableHead> 
                      <TableHead className="text-right">Azioni</TableHead> 
                    </TableRow> 
                  </TableHeader> 
                  <TableBody> 
                    {requests?.length === 0 && ( 
                      <TableRow> 
                        <TableCell colSpan={7} className="text-center text-gray-500"> 
                          Nessuna richiesta 
                        </TableCell> 
                      </TableRow> 
                    )} 
                    {requests?.map((request: any) => ( 
                      <TableRow key={request.id}> 
                        <TableCell className="font-medium text-sm">{request.userId.substring(0, 8)}...</TableCell> 
                        <TableCell> 
                          <Badge variant="outline">{request.materia}</Badge> 
                        </TableCell> 
                        <TableCell className="max-w-[200px] truncate">{request.argomento}</TableCell> 
                        <TableCell className="max-w-[250px] truncate text-sm text-gray-600"> 
                          {request.descrizione || '-'} 
                        </TableCell> 
                        <TableCell className="text-sm"> 
                          {new Date(request.createdAt).toLocaleDateString('it-IT')} 
                        </TableCell> 
                        <TableCell> 
                          {request.status === 'pending' && ( 
                            <Badge className="bg-orange-100 text-orange-700"> 
                              <Clock className="w-3 h-3 mr-1" /> 
                              Pending 
                            </Badge> 
                          )} 
                          {request.status === 'completed' && ( 
                            <Badge className="bg-green-100 text-green-700"> 
                              <CheckCircle className="w-3 h-3 mr-1" /> 
                              Completata 
                            </Badge> 
                          )} 
                          {request.status === 'rejected' && ( 
                            <Badge className="bg-red-100 text-red-700"> 
                              <XCircle className="w-3 h-3 mr-1" /> 
                              Rifiutata 
                            </Badge> 
                          )} 
                        </TableCell> 
                        <TableCell className="text-right space-x-2">
                          {request.status === 'pending' && (
                            <>
                              {/* NUOVO: Bottone Upload Podcast per la Richiesta */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log('🎯 Click Upload per richiesta:', request.id);
                                  setSelectedRequest(request);
                                  setUploadDialogOpen(true);
                                }}
                                title="Carica podcast per questa richiesta"
                              >
                                <Upload className="w-4 h-4 text-blue-500" />
                              </Button>
                              
                              {/* Approva Manualmente (senza upload) */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionRequest(request);
                                  setActionType('approve');
                                  setActionNote('');
                                  setActionDialogOpen(true);
                                }}
                                title="Approva senza caricare podcast"
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              
                              {/* Rifiuta */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActionRequest(request);
                                  setActionType('reject');
                                  setActionNote('');
                                  setActionDialogOpen(true);
                                }}
                                title="Rifiuta richiesta"
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {request.status === 'completed' && (
                            <div className="text-xs text-gray-600">
                              {request.podcastId && (
                                <Badge className="bg-green-100 text-green-700">
                                  <Headphones className="w-3 h-3 mr-1" />
                                  Podcast Caricato
                                </Badge>
                              )}
                              {!request.podcastId && (
                                <span className="text-gray-500">Approvata manualmente</span>
                              )}
                            </div>
                          )}
                          {request.status === 'rejected' && (
                            <span className="text-xs text-red-600">
                              {request.noteStaff || 'Rifiutata'}
                            </span>
                          )}
                        </TableCell> 
                      </TableRow> 
                    ))} 
                  </TableBody> 
                </Table> 
              </CardContent> 
            </Card> 
          </TabsContent> 

          {/* ============================================ */} 
          {/* TAB: STAFF MANAGEMENT */} 
          {/* ============================================ */} 
          <TabsContent value="staff"> 
            <Card> 
              <CardHeader> 
                <div className="flex items-center justify-between"> 
                  <div> 
                    <CardTitle>Gestione Staff</CardTitle> 
                    <CardDescription> 
                      Aggiungi o rimuovi membri dello staff che possono gestire podcast e richieste 
                    </CardDescription> 
                  </div> 
                  <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}> 
                    <DialogTrigger asChild> 
                      <Button className="bg-blue-500 hover:bg-blue-600"> 
                        <Plus className="w-4 h-4 mr-2" /> 
                        Aggiungi Staff 
                      </Button> 
                    </DialogTrigger> 
                    <DialogContent> 
                      <form onSubmit={handleAddStaffSubmit}> 
                        <DialogHeader> 
                          <DialogTitle>Aggiungi Membro Staff</DialogTitle> 
                          <DialogDescription> 
                            Inserisci i dati del nuovo membro dello staff 
                          </DialogDescription> 
                        </DialogHeader> 
                        <div className="space-y-4 py-4"> 
                          <div> 
                            <Label htmlFor="staff-email">Email *</Label> 
                            <Input 
                              id="staff-email" 
                              name="email" 
                              type="email" 
                              placeholder="staff@trae-ai.com" 
                              required 
                            /> 
                            <p className="text-xs text-gray-500 mt-1"> 
                              Questa email potrà accedere alle funzioni staff 
                            </p> 
                          </div> 
                          <div> 
                            <Label htmlFor="staff-nome">Nome Completo *</Label> 
                            <Input 
                              id="staff-nome" 
                              name="nome" 
                              placeholder="Mario Rossi" 
                              required 
                            /> 
                          </div> 
                          <div> 
                            <Label htmlFor="staff-ruolo">Ruolo</Label> 
                            <Select name="ruolo" defaultValue="staff"> 
                              <SelectTrigger> 
                                <SelectValue /> 
                              </SelectTrigger> 
                              <SelectContent> 
                                <SelectItem value="staff">Staff</SelectItem> 
                                <SelectItem value="moderator">Moderator</SelectItem> 
                                <SelectItem value="admin">Admin</SelectItem> 
                              </SelectContent> 
                            </Select> 
                            <p className="text-xs text-gray-500 mt-1"> 
                              <strong>Staff:</strong> Gestione podcast e richieste<br/> 
                              <strong>Moderator:</strong> + Gestione utenti<br/> 
                              <strong>Admin:</strong> Accesso completo 
                            </p> 
                          </div> 
                        </div> 
                        <DialogFooter> 
                          <Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)}> 
                            Annulla 
                          </Button> 
                          <Button type="submit" disabled={addStaffMutation.isPending}> 
                            {addStaffMutation.isPending ? 'Aggiunta...' : 'Aggiungi Staff'} 
                          </Button> 
                        </DialogFooter> 
                      </form> 
                    </DialogContent> 
                  </Dialog> 
                </div> 
              </CardHeader> 
              <CardContent> 
                <Table> 
                  <TableHeader> 
                    <TableRow> 
                      <TableHead>Nome</TableHead> 
                      <TableHead>Email</TableHead> 
                      <TableHead>Ruolo</TableHead> 
                      <TableHead>Stato</TableHead> 
                      <TableHead>Ultimo Accesso</TableHead> 
                      <TableHead className="text-right">Azioni</TableHead> 
                    </TableRow> 
                  </TableHeader> 
                  <TableBody> 
                    {staff?.length === 0 && ( 
                      <TableRow> 
                        <TableCell colSpan={6} className="text-center text-gray-500"> 
                          Nessun membro staff 
                        </TableCell> 
                      </TableRow> 
                    )} 
                    {staff?.map((member: any) => ( 
                      <TableRow key={member.id}> 
                        <TableCell className="font-medium">{member.nome}</TableCell> 
                        <TableCell>{member.email}</TableCell> 
                        <TableCell> 
                          <Badge 
                            variant="outline" 
                            className={ 
                              member.ruolo === 'admin' 
                                ? 'border-yellow-400 text-yellow-700 bg-yellow-50' 
                                : member.ruolo === 'moderator' 
                                ? 'border-blue-400 text-blue-700 bg-blue-50' 
                                : 'border-gray-400 text-gray-700' 
                            } 
                          > 
                            {member.ruolo === 'admin' && <Crown className="w-3 h-3 mr-1" />} 
                            {member.ruolo === 'moderator' && <Shield className="w-3 h-3 mr-1" />} 
                            <span className="capitalize">{member.ruolo}</span> 
                          </Badge> 
                        </TableCell> 
                        <TableCell> 
                          {member.isActive ? ( 
                            <Badge className="bg-green-100 text-green-700">Attivo</Badge> 
                          ) : ( 
                            <Badge className="bg-gray-100 text-gray-700">Inattivo</Badge> 
                          )} 
                        </TableCell> 
                        <TableCell className="text-sm text-gray-600"> 
                          {member.lastLogin 
                            ? new Date(member.lastLogin).toLocaleDateString('it-IT') 
                            : 'Mai'} 
                        </TableCell> 
                        <TableCell className="text-right"> 
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                              if (confirm(`Rimuovere ${member.nome} dallo staff?`)) { 
                                deleteStaffMutation.mutate(member.id); 
                              } 
                            }} 
                            title="Rimuovi staff" 
                          > 
                            <Trash2 className="w-4 h-4 text-red-500" /> 
                          </Button> 
                        </TableCell> 
                      </TableRow> 
                    ))} 
                  </TableBody> 
                </Table> 
              </CardContent> 
            </Card> 
          </TabsContent> 
        </Tabs>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}
        {/* Dialog Azione Richiesta (Approva/Rifiuta) */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? '✅ Approva Richiesta' : '❌ Rifiuta Richiesta'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? 'La richiesta verrà segnata come completata manualmente. Puoi aggiungere una nota per l\'utente.' 
                  : 'La richiesta verrà rifiutata. Specifica il motivo per l\'utente.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="action-note">
                {actionType === 'approve' ? 'Note (Opzionale)' : 'Motivo del rifiuto *'}
              </Label>
              <Textarea
                id="action-note"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'approve' ? "Es: Richiesta gestita via email..." : "Es: Argomento non pertinente..."}
                rows={3}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                variant={actionType === 'reject' ? "destructive" : "default"}
                onClick={() => {
                  if (actionType === 'reject' && !actionNote.trim()) {
                    toast({
                      title: "⚠️ Motivo obbligatorio",
                      description: "Inserisci il motivo del rifiuto",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  if (actionRequest) {
                    updateRequestMutation.mutate({
                      id: actionRequest.id,
                      status: actionType === 'approve' ? 'completed' : 'rejected',
                      noteStaff: actionNote.trim() || undefined,
                    });
                    setActionDialogOpen(false);
                  }
                }}
              >
                Conferma {actionType === 'approve' ? 'Approvazione' : 'Rifiuto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Upload (esistente) */}
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setSelectedRequest(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (selectedRequest) {
                formData.append('requestId', selectedRequest.id);
              }
              uploadPodcastMutation.mutate(formData);
            }}>
              <DialogHeader>
                <DialogTitle>
                  {selectedRequest ? '📝 Carica Podcast per Richiesta' : 'Carica Nuovo Podcast'}
                </DialogTitle>
                <DialogDescription>
                  {selectedRequest && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2 mb-4">
                      <p className="text-sm font-semibold text-blue-900">Richiesta Utente:</p>
                      <p className="text-sm text-blue-700">Materia: {selectedRequest.materia}</p>
                      <p className="text-sm text-blue-700">Argomento: {selectedRequest.argomento}</p>
                    </div>
                  )}
                  Compila i campi per caricare un nuovo podcast nella banca dati
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="titolo">Titolo *</Label>
                  <Input
                    id="titolo"
                    name="titolo"
                    placeholder="Es: Introduzione al Diritto Amministrativo"
                    defaultValue={selectedRequest?.argomento || ''}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descrizione">Descrizione</Label>
                  <Textarea
                    id="descrizione"
                    name="descrizione"
                    placeholder="Descrizione breve del contenuto..."
                    defaultValue={selectedRequest?.descrizione || ''}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="materia">Materia *</Label>
                    <Select name="materia" defaultValue={selectedRequest?.materia || ''} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona materia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diritto Amministrativo">Diritto Amministrativo</SelectItem>
                        <SelectItem value="Diritto Costituzionale">Diritto Costituzionale</SelectItem>
                        <SelectItem value="Diritto Civile">Diritto Civile</SelectItem>
                        <SelectItem value="Contabilità Pubblica">Contabilità Pubblica</SelectItem>
                        <SelectItem value="Diritto del Lavoro">Diritto del Lavoro</SelectItem>
                        <SelectItem value="Economia Aziendale">Economia Aziendale</SelectItem>
                        <SelectItem value="Informatica">Informatica</SelectItem>
                        <SelectItem value="Lingua Inglese">Lingua Inglese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="argomento">Argomento</Label>
                    <Input
                      id="argomento"
                      name="argomento"
                      placeholder="Es: Principi generali"
                      defaultValue={selectedRequest?.argomento || ''}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="durata">Durata (secondi)</Label>
                    <Input
                      id="durata"
                      name="durata"
                      type="number"
                      placeholder="Es: 900 (15 min)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="isPremiumOnly">Premium Only?</Label>
                    <Select name="isPremiumOnly" defaultValue="true">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sì (Premium)</SelectItem>
                        <SelectItem value="false">No (Pubblico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="audio">File Audio * (MP3, max 100MB)</Label>
                  <Input
                    id="audio"
                    name="audio"
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trascrizione">Trascrizione (opzionale)</Label>
                  <Textarea
                    id="trascrizione"
                    name="trascrizione"
                    placeholder="Testo completo del podcast..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={uploadPodcastMutation.isPending}>
                  {uploadPodcastMutation.isPending ? 'Caricamento...' : 'Carica Podcast'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
