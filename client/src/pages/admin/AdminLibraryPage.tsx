import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Library,
  Upload,
  Plus,
  Search,
  Trash2,
  Edit,
  FileText,
  Download,
  Loader2,
  Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const MATERIE = [
  "Diritto Costituzionale",
  "Diritto Amministrativo",
  "Diritto Civile",
  "Diritto Penale",
  "Diritto del Lavoro",
  "Economia Politica",
  "Contabilità Pubblica",
  "Informatica",
  "Inglese",
  "Logica e Ragionamento",
  "Cultura Generale",
  "Altro"
] as const;

interface Documento {
  id: string;
  titolo: string;
  descrizione?: string;
  materia: string;
  tags?: string[];
  fileName?: string;
  fileSize?: number;
  downloadCount: number;
  isStaffOnly: boolean;
  createdAt: string;
  hasPdf: boolean;
}

export default function AdminLibraryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMateria, setFilterMateria] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Documento | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    materia: "",
    tags: "",
    isStaffOnly: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch documenti
  const { data: documenti = [], isLoading } = useQuery<Documento[]>({
    queryKey: ['admin-library', searchTerm, filterMateria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterMateria && filterMateria !== 'all') params.append('materia', filterMateria);

      const res = await fetch(`/api/libreria/documenti?${params}`);
      if (!res.ok) throw new Error('Errore caricamento documenti');
      return res.json();
    }
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Seleziona un file PDF');
      if (!formData.titolo || !formData.materia) throw new Error('Titolo e materia sono obbligatori');

      const form = new FormData();
      form.append('pdf', selectedFile);
      form.append('titolo', formData.titolo);
      form.append('descrizione', formData.descrizione);
      form.append('materia', formData.materia);
      form.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim()).filter(Boolean)));
      form.append('isStaffOnly', String(formData.isStaffOnly));

      const res = await fetch('/api/libreria/documenti', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore upload');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento caricato", description: "Il documento è stato aggiunto alla libreria." });
      queryClient.invalidateQueries({ queryKey: ['admin-library'] });
      resetForm();
      setIsUploadOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/libreria/documenti/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento eliminato" });
      queryClient.invalidateQueries({ queryKey: ['admin-library'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Documento> }) => {
      const res = await fetch(`/api/libreria/documenti/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento aggiornato" });
      queryClient.invalidateQueries({ queryKey: ['admin-library'] });
      setEditingDoc(null);
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({ titolo: "", descrizione: "", materia: "", tags: "", isStaffOnly: false });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Errore", description: "File troppo grande (max 50MB)", variant: "destructive" });
        return;
      }
      if (!file.type.includes('pdf')) {
        toast({ title: "Errore", description: "Solo file PDF", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Libreria Pubblica</h2>
            <p className="text-muted-foreground">Gestisci i documenti della libreria pubblica.</p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsUploadOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Carica Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Carica nuovo documento</DialogTitle>
                <DialogDescription>
                  Aggiungi un nuovo PDF alla libreria pubblica.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* File Input */}
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2">Clicca per selezionare un PDF</p>
                      <p className="text-sm text-muted-foreground">Max 50MB</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titolo *</Label>
                    <Input
                      value={formData.titolo}
                      onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                      placeholder="Titolo del documento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Materia *</Label>
                    <Select value={formData.materia} onValueChange={(v) => setFormData({ ...formData, materia: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona materia" />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIE.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    placeholder="Breve descrizione del contenuto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags (separati da virgola)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="es: costituzione, articoli, diritti"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isStaffOnly}
                    onCheckedChange={(v) => setFormData({ ...formData, isStaffOnly: v })}
                  />
                  <Label>Solo per staff (non visibile pubblicamente)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Annulla</Button>
                <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Carica
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                Documenti ({documenti.length})
              </CardTitle>
              <div className="flex items-center gap-4">
                <Select value={filterMateria} onValueChange={setFilterMateria}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tutte le materie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le materie</SelectItem>
                    {MATERIE.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca documento..."
                    className="w-[250px] h-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Dimensione</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Visibilità</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documenti.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nessun documento trovato.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documenti.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="font-medium">{doc.titolo}</p>
                              {doc.fileName && (
                                <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.materia}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {doc.downloadCount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={doc.isStaffOnly ? "secondary" : "default"}>
                            {doc.isStaffOnly ? "Staff Only" : "Pubblico"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.createdAt).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" title="Anteprima">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Modifica"
                              onClick={() => setEditingDoc(doc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Elimina"
                              onClick={() => {
                                if (confirm('Eliminare questo documento?')) {
                                  deleteMutation.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica documento</DialogTitle>
            </DialogHeader>
            {editingDoc && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titolo</Label>
                  <Input
                    value={editingDoc.titolo}
                    onChange={(e) => setEditingDoc({ ...editingDoc, titolo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea
                    value={editingDoc.descrizione || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, descrizione: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingDoc.isStaffOnly}
                    onCheckedChange={(v) => setEditingDoc({ ...editingDoc, isStaffOnly: v })}
                  />
                  <Label>Solo per staff</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDoc(null)}>Annulla</Button>
              <Button
                onClick={() => {
                  if (editingDoc) {
                    updateMutation.mutate({
                      id: editingDoc.id,
                      data: {
                        titolo: editingDoc.titolo,
                        descrizione: editingDoc.descrizione,
                        isStaffOnly: editingDoc.isStaffOnly,
                      }
                    });
                  }
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
