
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Loader2, Edit, Trash2, BookOpen, Layers, Library, ScrollText, Upload, Folder, FolderPlus, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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

  // State for Folders
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [folderForm, setFolderForm] = useState({ nome: "", descrizione: "", colore: "#3b82f6" });

  // State for Documento Dialog
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ 
    titolo: "", descrizione: "", materia: "Diritto Amministrativo", 
    fileName: "", isStaffOnly: false, pdfBase64: "", folderId: "" 
  });

  // Fetch Concorsi
  const { data: concorsi, isLoading: isLoadingConcorsi } = useQuery({
    queryKey: ['admin-concorsi'],
    queryFn: async () => {
      const res = await fetch('/api/admin/concorsi');
      if (!res.ok) throw new Error('Errore caricamento concorsi');
      return res.json();
    }
  });

  // Fetch Normative
  const { data: normative, isLoading: isLoadingNormative } = useQuery({
    queryKey: ['admin-normative'],
    queryFn: async () => {
      const res = await fetch('/api/admin/normative');
      if (!res.ok) throw new Error('Errore caricamento normative');
      return res.json();
    }
  });

  // Fetch Documenti Pubblici
  const { data: documenti, isLoading: isLoadingDocumenti } = useQuery({
    queryKey: ['admin-documenti-pubblici'],
    queryFn: async () => {
      const res = await fetch('/api/admin/documenti-pubblici');
      if (!res.ok) throw new Error('Errore caricamento documenti');
      return res.json();
    }
  });

  // Fetch Folders
  const { data: folders, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['admin-folders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cartelle-libreria');
      if (!res.ok) throw new Error('Errore caricamento cartelle');
      return res.json();
    }
  });

  // Mutations
  const createConcorsoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/concorsi', {
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
      queryClient.invalidateQueries({ queryKey: ['admin-concorsi'] });
    }
  });

  const createNormativaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/normative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normativaForm)
      });
      if (!res.ok) throw new Error('Errore creazione normativa');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Normativa aggiunta", description: "La norma è stata aggiunta alla biblioteca." });
      setIsNormativaOpen(false);
      setNormativaForm({ titolo: "", tipo: "Legge", numero: "", anno: new Date().getFullYear().toString(), data: "", urlNormattiva: "", urn: "" });
      queryClient.invalidateQueries({ queryKey: ['admin-normative'] });
    }
  });

  const createDocMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/documenti-pubblici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm)
      });
      if (!res.ok) throw new Error('Errore caricamento documento');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento caricato", description: "Il file è stato aggiunto alla libreria pubblica." });
      setIsDocOpen(false);
      setDocForm({ titolo: "", descrizione: "", materia: "Diritto Amministrativo", fileName: "", isStaffOnly: false, pdfBase64: "", folderId: "" });
      queryClient.invalidateQueries({ queryKey: ['admin-documenti-pubblici'] });
    }
  });

  // Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/cartelle-libreria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...folderForm, parentId: currentFolderId })
      });
      if (!res.ok) throw new Error('Errore creazione cartella');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cartella creata" });
      setIsFolderOpen(false);
      setFolderForm({ nome: "", descrizione: "", colore: "#3b82f6" });
      queryClient.invalidateQueries({ queryKey: ['admin-folders'] });
    }
  });

  // Filtered Content based on Folder
  const currentFolders = folders?.filter((f: any) => 
    currentFolderId ? f.parentId === currentFolderId : !f.parentId
  ) || [];

  const currentDocs = documenti?.filter((d: any) => 
    currentFolderId ? d.folderId === currentFolderId : !d.folderId
  ) || [];

  const getCurrentFolderName = () => {
    if (!currentFolderId) return "Root";
    return folders?.find((f: any) => f.id === currentFolderId)?.nome || "Cartella";
  };

  // File Upload Handler (Simulated Base64 for now)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In real app: Upload to S3/Storage and get URL
      // Here: Just mock name and size, maybe base64 if small
      setDocForm({ ...docForm, fileName: file.name });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocForm(prev => ({ ...prev, pdfBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
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
                      <Input value={concorsoForm.nome} onChange={(e) => setConcorsoForm({...concorsoForm, nome: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descrizione</label>
                      <Input value={concorsoForm.descrizione} onChange={(e) => setConcorsoForm({...concorsoForm, descrizione: e.target.value})} />
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
                             await fetch(`/api/admin/concorsi/${c.id}`, { method: 'DELETE' });
                             queryClient.invalidateQueries({ queryKey: ['admin-concorsi'] });
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
                {currentFolderId && (
                   <Button variant="ghost" size="sm" onClick={() => setCurrentFolderId(null)}>
                     <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                   </Button>
                )}
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Library className="h-5 w-5" /> 
                  {currentFolderId ? getCurrentFolderName() : "Libreria Pubblica"}
                </h3>
              </div>
              
              <div className="flex gap-2">
                {/* New Folder Button */}
                <Dialog open={isFolderOpen} onOpenChange={setIsFolderOpen}>
                  <DialogTrigger asChild><Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" /> Nuova Cartella</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nuova Cartella</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome Cartella</label>
                        <Input value={folderForm.nome} onChange={(e) => setFolderForm({...folderForm, nome: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Colore</label>
                         <div className="flex gap-2">
                           {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                             <div 
                               key={color} 
                               className={`w-6 h-6 rounded-full cursor-pointer border-2 ${folderForm.colore === color ? 'border-black' : 'border-transparent'}`}
                               style={{ backgroundColor: color }}
                               onClick={() => setFolderForm({...folderForm, colore: color})}
                             />
                           ))}
                         </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => createFolderMutation.mutate()} disabled={createFolderMutation.isPending}>Crea</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Upload File Button */}
                <Dialog open={isDocOpen} onOpenChange={(open) => {
                    setIsDocOpen(open);
                    if(open) setDocForm(prev => ({ ...prev, folderId: currentFolderId || "" }));
                }}>
                  <DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" /> Carica File</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Carica Documento in {getCurrentFolderName()}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Titolo</label>
                        <Input value={docForm.titolo} onChange={(e) => setDocForm({...docForm, titolo: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Materia</label>
                        <Select value={docForm.materia} onValueChange={(v) => setDocForm({...docForm, materia: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Diritto Amministrativo">Diritto Amministrativo</SelectItem>
                            <SelectItem value="Diritto Costituzionale">Diritto Costituzionale</SelectItem>
                            <SelectItem value="Contabilità Pubblica">Contabilità Pubblica</SelectItem>
                            <SelectItem value="Altro">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">File (PDF/Audio/Video)</label>
                        <Input type="file" onChange={handleFileUpload} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => createDocMutation.mutate()} disabled={createDocMutation.isPending || !docForm.fileName}>
                        {createDocMutation.isPending ? "Caricamento..." : "Carica"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {currentFolders.map((folder: any) => (
                <Card 
                  key={folder.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 relative group"
                  style={{ borderLeftColor: folder.colore }}
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Folder className="h-8 w-8 text-muted-foreground" style={{ color: folder.colore }} />
                    <div className="overflow-hidden flex-1">
                      <h4 className="font-medium truncate">{folder.nome}</h4>
                      <p className="text-xs text-muted-foreground truncate">{folder.descrizione || "Cartella"}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        if(confirm("Eliminare questa cartella?")) {
                          fetch(`/api/admin/cartelle-libreria/${folder.id}`, { method: 'DELETE' })
                            .then(() => queryClient.invalidateQueries({ queryKey: ['admin-folders'] }));
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Titolo</TableHead><TableHead>Materia</TableHead><TableHead>File</TableHead><TableHead>Azioni</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDocs.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessun documento in questa cartella.</TableCell></TableRow>
                    ) : (
                      currentDocs.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            {d.titolo}
                          </TableCell>
                          <TableCell><Badge variant="outline">{d.materia}</Badge></TableCell>
                          <TableCell>{d.fileName}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                               if (!confirm("Eliminare documento?")) return;
                               await fetch(`/api/admin/documenti-pubblici/${d.id}`, { method: 'DELETE' });
                               queryClient.invalidateQueries({ queryKey: ['admin-documenti-pubblici'] });
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB NORMATIVA */}
          <TabsContent value="normativa" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Biblioteca Normativa</h3>
              <Dialog open={isNormativaOpen} onOpenChange={setIsNormativaOpen}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Aggiungi Norma</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nuova Normativa</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo</label>
                        <Select value={normativaForm.tipo} onValueChange={(v) => setNormativaForm({...normativaForm, tipo: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Legge">Legge</SelectItem>
                            <SelectItem value="Decreto Legislativo">D.Lgs</SelectItem>
                            <SelectItem value="DPR">DPR</SelectItem>
                            <SelectItem value="Costituzione">Costituzione</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Numero</label>
                        <Input placeholder="es. 241" value={normativaForm.numero} onChange={(e) => setNormativaForm({...normativaForm, numero: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anno</label>
                      <Input placeholder="es. 1990" value={normativaForm.anno} onChange={(e) => setNormativaForm({...normativaForm, anno: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Titolo</label>
                      <Input placeholder="Legge sul procedimento amministrativo" value={normativaForm.titolo} onChange={(e) => setNormativaForm({...normativaForm, titolo: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">URL Normattiva</label>
                      <Input placeholder="https://www.normattiva.it/..." value={normativaForm.urlNormattiva} onChange={(e) => setNormativaForm({...normativaForm, urlNormattiva: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => createNormativaMutation.mutate()} disabled={createNormativaMutation.isPending}>
                      {createNormativaMutation.isPending ? "Salvataggio..." : "Salva Norma"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Atto</TableHead><TableHead>Titolo</TableHead><TableHead>Link</TableHead><TableHead>Azioni</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {normative?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessuna normativa presente.</TableCell></TableRow>
                    ) : (
                      normative?.map((n: any) => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium whitespace-nowrap">{n.tipo} {n.numero}/{n.anno}</TableCell>
                          <TableCell>{n.titolo}</TableCell>
                          <TableCell>
                            <a href={n.urlNormattiva} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              Link <ScrollText className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                               if (!confirm("Eliminare norma?")) return;
                               await fetch(`/api/admin/normative/${n.id}`, { method: 'DELETE' });
                               queryClient.invalidateQueries({ queryKey: ['admin-normative'] });
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}
