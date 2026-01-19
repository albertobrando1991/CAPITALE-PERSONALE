import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Headphones,
    Upload,
    Plus,
    Search,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Play,
    FileAudio,
    MessageSquare,
    ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface PodcastRequest {
    id: string;
    userId: string;
    materia: string;
    argomento: string;
    descrizione?: string;
    status: string;
    priorita: string;
    noteStaff?: string;
    createdAt: string;
    completedAt?: string;
}

interface Podcast {
    id: string;
    titolo: string;
    descrizione?: string;
    materia: string;
    argomento: string;
    durata?: number;
    ascoltiTotali?: number;
    createdAt: string;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'In Attesa', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_progress', label: 'In Produzione', icon: Loader2, color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completato', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
    { value: 'rejected', label: 'Rifiutato', icon: XCircle, color: 'bg-red-100 text-red-800' },
];

export default function AdminPodcastPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<PodcastRequest | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        titolo: "",
        descrizione: "",
        materia: "",
        argomento: "",
        durata: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Requests
    const { data: requests = [], isLoading: isLoadingRequests } = useQuery<PodcastRequest[]>({
        queryKey: ['admin-podcast-requests', statusFilter],
        queryFn: async () => {
            const res = await fetch(`/api/admin/podcast/requests?status=${statusFilter}`);
            if (!res.ok) throw new Error('Errore caricamento richieste');
            return res.json();
        }
    });

    // Fetch Library
    const { data: podcasts = [], isLoading: isLoadingLibrary } = useQuery<Podcast[]>({
        queryKey: ['admin-podcast-library'],
        queryFn: async () => {
            const res = await fetch('/api/admin/podcast/library');
            if (!res.ok) throw new Error('Errore caricamento libreria');
            return res.json();
        }
    });

    // Update Request Status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, noteStaff }: { id: string; status: string; noteStaff?: string }) => {
            const res = await fetch(`/api/admin/podcast/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, noteStaff }),
            });
            if (!res.ok) throw new Error('Errore aggiornamento');
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Stato aggiornato" });
            queryClient.invalidateQueries({ queryKey: ['admin-podcast-requests'] });
            setSelectedRequest(null);
        },
        onError: (err: Error) => {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        }
    });

    // Upload Podcast
    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error('Seleziona un file audio');
            if (!uploadForm.titolo || !uploadForm.materia || !uploadForm.argomento) {
                throw new Error('Compila tutti i campi obbligatori');
            }

            const formData = new FormData();
            formData.append('audio', selectedFile);
            formData.append('titolo', uploadForm.titolo);
            formData.append('descrizione', uploadForm.descrizione);
            formData.append('materia', uploadForm.materia);
            formData.append('argomento', uploadForm.argomento);
            formData.append('durata', uploadForm.durata);

            const res = await fetch('/api/podcast/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Errore upload');
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Podcast caricato!" });
            queryClient.invalidateQueries({ queryKey: ['admin-podcast-library'] });
            setIsUploadOpen(false);
            resetUploadForm();
        },
        onError: (err: Error) => {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        }
    });

    // Delete Podcast
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/podcast/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Errore eliminazione');
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Podcast eliminato" });
            queryClient.invalidateQueries({ queryKey: ['admin-podcast-library'] });
        },
        onError: (err: Error) => {
            toast({ title: "Errore", description: err.message, variant: "destructive" });
        }
    });

    const resetUploadForm = () => {
        setUploadForm({ titolo: "", descrizione: "", materia: "", argomento: "", durata: "" });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusBadge = (status: string) => {
        const opt = STATUS_OPTIONS.find(o => o.value === status);
        if (!opt) return <Badge>{status}</Badge>;
        const Icon = opt.icon;
        return (
            <Badge className={opt.color}>
                <Icon className={`w-3 h-3 mr-1 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
                {opt.label}
            </Badge>
        );
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        return `${mins} min`;
    };

    return (
        <AdminLayout>
            <div className="flex flex-col space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Gestione Podcast</h2>
                        <p className="text-muted-foreground">Gestisci richieste utenti e libreria podcast premium.</p>
                    </div>
                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { resetUploadForm(); setIsUploadOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Carica Podcast
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Carica Nuovo Podcast</DialogTitle>
                                <DialogDescription>Aggiungi un nuovo podcast alla libreria premium.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div
                                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    {selectedFile ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <FileAudio className="h-8 w-8 text-primary" />
                                            <div>
                                                <p className="font-medium">{selectedFile.name}</p>
                                                <p className="text-sm text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                                            <p className="mt-2">Clicca per selezionare un file audio</p>
                                            <p className="text-sm text-muted-foreground">MP3, WAV - Max 50MB</p>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Titolo *</Label>
                                        <Input value={uploadForm.titolo} onChange={(e) => setUploadForm({ ...uploadForm, titolo: e.target.value })} placeholder="Titolo podcast" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Materia *</Label>
                                        <Select value={uploadForm.materia} onValueChange={(v) => setUploadForm({ ...uploadForm, materia: v })}>
                                            <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Diritto Amministrativo">Diritto Amministrativo</SelectItem>
                                                <SelectItem value="Diritto Costituzionale">Diritto Costituzionale</SelectItem>
                                                <SelectItem value="Diritto Civile">Diritto Civile</SelectItem>
                                                <SelectItem value="Contabilità Pubblica">Contabilità Pubblica</SelectItem>
                                                <SelectItem value="Altro">Altro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Argomento *</Label>
                                        <Input value={uploadForm.argomento} onChange={(e) => setUploadForm({ ...uploadForm, argomento: e.target.value })} placeholder="es. Procedimento Amministrativo" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Durata (secondi)</Label>
                                        <Input type="number" value={uploadForm.durata} onChange={(e) => setUploadForm({ ...uploadForm, durata: e.target.value })} placeholder="es. 600" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrizione</Label>
                                    <Textarea value={uploadForm.descrizione} onChange={(e) => setUploadForm({ ...uploadForm, descrizione: e.target.value })} placeholder="Descrizione del contenuto..." rows={3} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Annulla</Button>
                                <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
                                    {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Carica
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="requests" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="requests" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Richieste Utenti ({requests.length})
                        </TabsTrigger>
                        <TabsTrigger value="library" className="gap-2">
                            <Headphones className="h-4 w-4" />
                            Libreria Podcast ({podcasts.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* REQUESTS TAB */}
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Richieste Podcast Custom</CardTitle>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti gli stati</SelectItem>
                                            {STATUS_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoadingRequests ? (
                                    <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                ) : requests.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">Nessuna richiesta trovata.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Argomento</TableHead>
                                                <TableHead>Materia</TableHead>
                                                <TableHead>Stato</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Azioni</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requests.map((req) => (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{req.argomento}</p>
                                                            {req.descrizione && <p className="text-xs text-muted-foreground line-clamp-1">{req.descrizione}</p>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline">{req.materia}</Badge></TableCell>
                                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                    <TableCell>{new Date(req.createdAt).toLocaleDateString('it-IT')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                                                            Gestisci <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* LIBRARY TAB */}
                    <TabsContent value="library">
                        <Card>
                            <CardHeader>
                                <CardTitle>Libreria Podcast</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingLibrary ? (
                                    <div className="py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                ) : podcasts.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">Nessun podcast nella libreria.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Titolo</TableHead>
                                                <TableHead>Materia</TableHead>
                                                <TableHead>Durata</TableHead>
                                                <TableHead>Ascolti</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Azioni</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {podcasts.map((podcast) => (
                                                <TableRow key={podcast.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Headphones className="h-4 w-4 text-primary" />
                                                            <div>
                                                                <p className="font-medium">{podcast.titolo}</p>
                                                                <p className="text-xs text-muted-foreground">{podcast.argomento}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline">{podcast.materia}</Badge></TableCell>
                                                    <TableCell>{formatDuration(podcast.durata)}</TableCell>
                                                    <TableCell>{podcast.ascoltiTotali || 0}</TableCell>
                                                    <TableCell>{new Date(podcast.createdAt).toLocaleDateString('it-IT')}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" title="Elimina" onClick={() => {
                                                            if (confirm('Eliminare questo podcast?')) deleteMutation.mutate(podcast.id);
                                                        }}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* REQUEST DETAIL DIALOG */}
                <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gestisci Richiesta</DialogTitle>
                        </DialogHeader>
                        {selectedRequest && (
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Argomento richiesto</Label>
                                    <p className="font-medium">{selectedRequest.argomento}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Materia</Label>
                                    <p>{selectedRequest.materia}</p>
                                </div>
                                {selectedRequest.descrizione && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Descrizione utente</Label>
                                        <p className="text-sm">{selectedRequest.descrizione}</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Aggiorna Stato</Label>
                                    <Select
                                        value={selectedRequest.status}
                                        onValueChange={(v) => setSelectedRequest({ ...selectedRequest, status: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Note Staff (opzionale)</Label>
                                    <Textarea
                                        value={selectedRequest.noteStaff || ''}
                                        onChange={(e) => setSelectedRequest({ ...selectedRequest, noteStaff: e.target.value })}
                                        placeholder="Note interne o messaggio per l'utente..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Annulla</Button>
                            <Button
                                onClick={() => {
                                    if (selectedRequest) {
                                        updateStatusMutation.mutate({
                                            id: selectedRequest.id,
                                            status: selectedRequest.status,
                                            noteStaff: selectedRequest.noteStaff,
                                        });
                                    }
                                }}
                                disabled={updateStatusMutation.isPending}
                            >
                                {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salva
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
