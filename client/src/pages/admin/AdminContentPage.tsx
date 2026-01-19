
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Loader2, Trash2, Layers, Library, ScrollText, Upload, ExternalLink, FolderPlus, Folder, FolderOpen, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Materia {
  id: string;
  nome: string;
  ordine: number;
}

export default function AdminContentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("concorsi");
  const [searchTerm, setSearchTerm] = useState("");

  // State for Concorso Dialog
  const [isConcorsoOpen, setIsConcorsoOpen] = useState(false);
  const [concorsoForm, setConcorsoForm] = useState({ nome: "", descrizione: "", dataScadenza: "" });

  // State for Normativa Dialog
  const [isNormativaOpen, setIsNormativaOpen] = useState(false);
  const [normativaForm, setNormativaForm] = useState({
    titolo: "", tipo: "Legge", numero: "", anno: new Date().getFullYear().toString(),
    data: "", urlNormattiva: "", urn: ""
  });

  // State for Documento Dialog
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    titolo: "", descrizione: "", materia: "",
    fileName: "", isStaffOnly: false
  });

  // State for New Folder Dialog
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Fetch Concorsi
  const { data: concorsi, isLoading: isLoadingConcorsi } = useQuery({
    queryKey: ['concorsi'],
    queryFn: async () => {
      const res = await fetch('/api/concorsi');
      if (!res.ok) throw new Error('Errore caricamento concorsi');
      return res.json();
    }
  });

  // Fetch Normative - same endpoint as public page for sync
  const { data: normative, isLoading: isLoadingNormative } = useQuery({
    queryKey: ['norme', 'search'],
    queryFn: async () => {
      const res = await fetch('/api/norme/search?limit=100');
      if (!res.ok) throw new Error('Errore caricamento normative');
      return res.json();
    }
  });

  // Fetch Documenti Pubblici - same endpoint as public page for sync
  const { data: documenti, isLoading: isLoadingDocumenti } = useQuery({
    queryKey: ['libreria', 'documenti'],
    queryFn: async () => {
      const res = await fetch('/api/libreria/documenti');
      if (!res.ok) throw new Error('Errore caricamento documenti');
      return res.json();
    }
  });

  // Fetch Materie (Cartelle) - same endpoint as public page for sync
  const { data: materie = [] } = useQuery<Materia[]>({
    queryKey: ['materie'],
    queryFn: async () => {
      const res = await fetch('/api/libreria/materie');
      if (!res.ok) throw new Error('Errore caricamento materie');
      return res.json();
    }
  });

  // Mutations
  const createConcorsoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/concorsi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(concorsoForm)
      });
      if (!res.ok) throw new Error('Errore creazione concorso');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Concorso creato", description: "Il nuovo concorso è stato aggiunto con successo." });
      setIsConcorsoOpen(false);
      setConcorsoForm({ nome: "", descrizione: "", dataScadenza: "" });
      queryClient.invalidateQueries({ queryKey: ['concorsi'] });
    }
  });

  const createNormativaMutation = useMutation({
    mutationFn: async () => {
      // Build URN from tipo, numero, anno
      const urn = `urn:nir:stato:${normativaForm.tipo.toLowerCase().replace(/\s+/g, '.')}:${normativaForm.anno}-01-01;${normativaForm.numero}`;
      const res = await fetch('/api/norme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...normativaForm,
          urn,
          anno: parseInt(normativaForm.anno),
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.[0]?.message || 'Errore creazione normativa');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Normativa aggiunta", description: "La norma è stata aggiunta alla biblioteca." });
      setIsNormativaOpen(false);
      setNormativaForm({ titolo: "", tipo: "Legge", numero: "", anno: new Date().getFullYear().toString(), data: "", urlNormattiva: "", urn: "" });
      queryClient.invalidateQueries({ queryKey: ['norme', 'search'] });
    }
  });

  // For real upload with file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const createDocMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Seleziona un file PDF');

      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('titolo', docForm.titolo);
      formData.append('descrizione', docForm.descrizione);
      formData.append('materia', docForm.materia);
      formData.append('isStaffOnly', String(docForm.isStaffOnly));
      formData.append('tags', JSON.stringify([]));

      const res = await fetch('/api/libreria/documenti', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore caricamento documento');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento caricato", description: "Il file è stato aggiunto alla libreria pubblica." });
      setIsDocOpen(false);
      setDocForm({ titolo: "", descrizione: "", materia: "", fileName: "", isStaffOnly: false });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['libreria', 'documenti'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch('/api/libreria/materie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore creazione cartella');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cartella creata", description: "La nuova cartella è ora visibile nella libreria pubblica." });
      setIsFolderOpen(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey: ['materie'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Delete Folder Mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/libreria/materie/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore eliminazione cartella');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cartella eliminata" });
      queryClient.invalidateQueries({ queryKey: ['materie'] });
      queryClient.invalidateQueries({ queryKey: ['libreria', 'documenti'] });
      setSelectedFolder(null);
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // All documents
  const allDocs = documenti || [];

  // Group documents by materia for display
  const docsByMateria = allDocs.reduce((acc: Record<string, any[]>, doc: any) => {
    const materia = doc.materia || 'Altro';
    if (!acc[materia]) acc[materia] = [];
    acc[materia].push(doc);
    return acc;
  }, {});

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Errore", description: "File troppo grande (max 50MB)", variant: "destructive" });
        return;
      }
      if (!file.type.includes('pdf')) {
        toast({ title: "Errore", description: "Solo file PDF sono supportati", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setDocForm({ ...docForm, fileName: file.name });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestione Contenuti</h2>
            <p className="text-muted-foreground">Gestisci concorsi, materiali didattici e risorse pubbliche.</p>
          </div>
        </div>

        <Tabs defaultValue="concorsi" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="concorsi" className="flex gap-2"><Layers className="h-4 w-4" /> Concorsi</TabsTrigger>
            <TabsTrigger value="libreria" className="flex gap-2"><Library className="h-4 w-4" /> Libreria Pubblica</TabsTrigger>
            <TabsTrigger value="normativa" className="flex gap-2"><ScrollText className="h-4 w-4" /> Normativa</TabsTrigger>
          </TabsList>

          {/* TAB CONCORSI */}
          <TabsContent value="concorsi" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca concorso..."
                  className="w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Dialog open={isConcorsoOpen} onOpenChange={setIsConcorsoOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuovo Concorso</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Crea Nuovo Concorso</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input value={concorsoForm.nome} onChange={(e) => setConcorsoForm({ ...concorsoForm, nome: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descrizione</label>
                      <Input value={concorsoForm.descrizione} onChange={(e) => setConcorsoForm({ ...concorsoForm, descrizione: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConcorsoOpen(false)}>Annulla</Button>
                    <Button onClick={() => createConcorsoMutation.mutate()} disabled={createConcorsoMutation.isPending}>
                      {createConcorsoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crea
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Nome</TableHead><TableHead>Descrizione</TableHead><TableHead>Azioni</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {concorsi?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.descrizione}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                            if (!confirm("Eliminare?")) return;
                            await fetch(`/api/concorsi/${c.id}`, { method: 'DELETE' });
                            queryClient.invalidateQueries({ queryKey: ['concorsi'] });
                          }}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB LIBRERIA PUBBLICA */}
          <TabsContent value="libreria" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Libreria Pubblica ({allDocs.length} documenti, {materie.length} cartelle)
                </h3>
              </div>

              <div className="flex gap-2">
                {/* Create Folder Button */}
                <Dialog open={isFolderOpen} onOpenChange={setIsFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" /> Crea Cartella</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuova Cartella</DialogTitle>
                      <DialogDescription>La cartella creata sarà subito visibile nella Libreria Pubblica del sito.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome Cartella *</label>
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="es. Diritto Penale"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFolderOpen(false)}>Annulla</Button>
                      <Button
                        onClick={() => createFolderMutation.mutate(newFolderName)}
                        disabled={createFolderMutation.isPending || !newFolderName.trim()}
                      >
                        {createFolderMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione...</> : "Crea Cartella"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Upload File Button */}
                <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
                  <DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" /> Carica Documento</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Carica Documento</DialogTitle>
                      <DialogDescription>I documenti caricati saranno visibili nella Libreria Pubblica del sito.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Titolo *</label>
                        <Input value={docForm.titolo} onChange={(e) => setDocForm({ ...docForm, titolo: e.target.value })} placeholder="es. Costituzione Italiana Commentata" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Descrizione</label>
                        <Input value={docForm.descrizione} onChange={(e) => setDocForm({ ...docForm, descrizione: e.target.value })} placeholder="Breve descrizione del documento" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cartella/Materia *</label>
                        <Select value={docForm.materia} onValueChange={(v) => setDocForm({ ...docForm, materia: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleziona cartella" /></SelectTrigger>
                          <SelectContent>
                            {materie.length > 0 ? (
                              materie.map((m) => (
                                <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Diritto Amministrativo">Diritto Amministrativo</SelectItem>
                                <SelectItem value="Diritto Costituzionale">Diritto Costituzionale</SelectItem>
                                <SelectItem value="Diritto Civile">Diritto Civile</SelectItem>
                                <SelectItem value="Altro">Altro</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {materie.length === 0 && (
                          <p className="text-xs text-muted-foreground">Crea prima una cartella per organizzare i documenti.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">File PDF *</label>
                        <Input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} />
                        {selectedFile && <p className="text-sm text-muted-foreground">File selezionato: {selectedFile.name}</p>}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDocOpen(false)}>Annulla</Button>
                      <Button onClick={() => createDocMutation.mutate()} disabled={createDocMutation.isPending || !selectedFile || !docForm.titolo || !docForm.materia}>
                        {createDocMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento...</> : "Carica"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoadingDocumenti ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : !selectedFolder ? (
              /* FOLDER GRID VIEW */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Cartelle ({materie.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {materie.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nessuna cartella creata. Clicca "Crea Cartella" per iniziare.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {materie.map((m) => {
                        const docCount = allDocs.filter((d: any) => d.materia === m.nome).length;
                        return (
                          <Card
                            key={m.id}
                            className="cursor-pointer hover:border-primary hover:bg-muted/50 transition-all group relative"
                            onClick={() => setSelectedFolder(m.nome)}
                          >
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center">
                              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full group-hover:scale-110 transition-transform">
                                <Folder className="h-8 w-8 text-yellow-600 dark:text-yellow-500 fill-yellow-600/20" />
                              </div>
                              <div>
                                <span className="font-semibold block truncate max-w-[120px]">{m.nome}</span>
                                <span className="text-xs text-muted-foreground">{docCount} documenti</span>
                              </div>
                            </CardContent>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Eliminare la cartella "${m.nome}"? I documenti al suo interno non saranno eliminati.`)) {
                                  deleteFolderMutation.mutate(m.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* INSIDE FOLDER VIEW - Documents Table */
              <div className="space-y-4">
                {/* Back Button */}
                <div className="flex items-center gap-3 bg-muted/30 p-4 rounded-lg border">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFolder(null)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Torna alle cartelle
                  </Button>
                  <div className="h-6 w-px bg-border" />
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {selectedFolder}
                  </h3>
                  <Badge variant="outline" className="ml-auto">
                    {allDocs.filter((d: any) => d.materia === selectedFolder).length} documenti
                  </Badge>
                </div>

                {/* Documents Table */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titolo</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Downloads</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDocs.filter((d: any) => d.materia === selectedFolder).length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessun documento in questa cartella. Carica il primo!</TableCell></TableRow>
                        ) : (
                          allDocs.filter((d: any) => d.materia === selectedFolder).map((d: any) => (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-red-500" />
                                  <div>
                                    <p>{d.titolo}</p>
                                    {d.descrizione && <p className="text-xs text-muted-foreground">{d.descrizione}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{d.fileName || 'N/A'}</TableCell>
                              <TableCell>{d.downloadCount || 0}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                                  if (!confirm("Eliminare documento?")) return;
                                  await fetch(`/api/libreria/documenti/${d.id}`, { method: 'DELETE' });
                                  queryClient.invalidateQueries({ queryKey: ['libreria', 'documenti'] });
                                }}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB NORMATIVA */}
          <TabsContent value="normativa" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Biblioteca Normativa ({normative?.length || 0} norme)
              </h3>
              <Dialog open={isNormativaOpen} onOpenChange={setIsNormativaOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Aggiungi Norma</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuova Normativa</DialogTitle>
                    <DialogDescription>Le norme aggiunte saranno visibili nella Biblioteca Normativa del sito.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo *</label>
                        <Select value={normativaForm.tipo} onValueChange={(v) => setNormativaForm({ ...normativaForm, tipo: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleziona tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Legge">Legge</SelectItem>
                            <SelectItem value="Decreto Legislativo">D.Lgs</SelectItem>
                            <SelectItem value="Decreto Legge">D.L.</SelectItem>
                            <SelectItem value="DPR">DPR</SelectItem>
                            <SelectItem value="DPCM">DPCM</SelectItem>
                            <SelectItem value="Costituzione">Costituzione</SelectItem>
                            <SelectItem value="Codice">Codice</SelectItem>
                            <SelectItem value="Regolamento UE">Regolamento UE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Numero</label>
                        <Input placeholder="es. 241" value={normativaForm.numero} onChange={(e) => setNormativaForm({ ...normativaForm, numero: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anno *</label>
                      <Input type="number" placeholder="es. 1990" value={normativaForm.anno} onChange={(e) => setNormativaForm({ ...normativaForm, anno: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Titolo *</label>
                      <Input placeholder="es. Norme in materia di procedimento amministrativo" value={normativaForm.titolo} onChange={(e) => setNormativaForm({ ...normativaForm, titolo: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">URL Normattiva *</label>
                      <Input placeholder="https://www.normattiva.it/..." value={normativaForm.urlNormattiva} onChange={(e) => setNormativaForm({ ...normativaForm, urlNormattiva: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNormativaOpen(false)}>Annulla</Button>
                    <Button onClick={() => createNormativaMutation.mutate()} disabled={createNormativaMutation.isPending || !normativaForm.tipo || !normativaForm.anno || !normativaForm.titolo || !normativaForm.urlNormattiva}>
                      {createNormativaMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</> : "Salva Norma"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingNormative ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atto</TableHead>
                        <TableHead>Titolo</TableHead>
                        <TableHead>Anno</TableHead>
                        <TableHead>Link</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normative?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessuna normativa presente. Aggiungi la prima norma!</TableCell></TableRow>
                      ) : (
                        normative?.map((n: any) => (
                          <TableRow key={n.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              <Badge variant="outline">{n.tipo}</Badge>
                              {n.numero && <span className="ml-2">n. {n.numero}</span>}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{n.titoloBreve || n.titolo}</p>
                                {n.titoloBreve && <p className="text-xs text-muted-foreground line-clamp-1">{n.titolo}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{n.anno}</TableCell>
                            <TableCell>
                              <a href={n.urlNormattiva} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                Normattiva <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                                if (!confirm("Eliminare norma?")) return;
                                await fetch(`/api/norme/${n.id}`, { method: 'DELETE' });
                                queryClient.invalidateQueries({ queryKey: ['norme', 'search'] });
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}
