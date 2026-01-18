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
import {
  Scale,
  Plus,
  Search,
  Trash2,
  Edit,
  ExternalLink,
  Loader2,
  FileText
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const TIPI_NORMA = [
  "Legge",
  "Decreto Legge",
  "Decreto Legislativo",
  "DPR",
  "DPCM",
  "Decreto Ministeriale",
  "Costituzione",
  "Codice",
  "Regolamento UE",
  "Direttiva UE",
  "Altro"
] as const;

interface Norma {
  id: string;
  urn: string;
  tipo: string;
  numero?: string;
  anno: number;
  data?: string;
  titolo: string;
  titoloBreve?: string;
  keywords?: string[];
  urlNormattiva: string;
  gazzettaUfficiale?: string;
  createdAt: string;
}

const emptyNorma = {
  urn: "",
  tipo: "",
  numero: "",
  anno: new Date().getFullYear(),
  data: "",
  titolo: "",
  titoloBreve: "",
  keywords: "",
  urlNormattiva: "",
  gazzettaUfficiale: "",
};

export default function AdminRegulationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterAnno, setFilterAnno] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNorma, setEditingNorma] = useState<Norma | null>(null);
  const [formData, setFormData] = useState(emptyNorma);

  // Fetch norme
  const { data: norme = [], isLoading } = useQuery<Norma[]>({
    queryKey: ['admin-norme', filterTipo, filterAnno],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterTipo && filterTipo !== 'all') params.append('tipo', filterTipo);
      if (filterAnno && filterAnno !== 'all') params.append('anno', filterAnno);
      params.append('limit', '100');

      const res = await fetch(`/api/admin/norme?${params}`);
      if (!res.ok) throw new Error('Errore caricamento norme');
      return res.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.urn || !formData.titolo || !formData.tipo || !formData.urlNormattiva) {
        throw new Error('Compila tutti i campi obbligatori');
      }

      const res = await fetch('/api/norme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          anno: parseInt(String(formData.anno)),
          keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.[0]?.message || err.error || 'Errore creazione');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Norma creata", description: "La norma è stata aggiunta all'indice." });
      queryClient.invalidateQueries({ queryKey: ['admin-norme'] });
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Norma> }) => {
      const res = await fetch(`/api/norme/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Norma aggiornata" });
      queryClient.invalidateQueries({ queryKey: ['admin-norme'] });
      setEditingNorma(null);
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/norme/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Norma eliminata" });
      queryClient.invalidateQueries({ queryKey: ['admin-norme'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData(emptyNorma);
  };

  const openEditDialog = (norma: Norma) => {
    setEditingNorma(norma);
    setFormData({
      urn: norma.urn,
      tipo: norma.tipo,
      numero: norma.numero || "",
      anno: norma.anno,
      data: norma.data || "",
      titolo: norma.titolo,
      titoloBreve: norma.titoloBreve || "",
      keywords: norma.keywords?.join(', ') || "",
      urlNormattiva: norma.urlNormattiva,
      gazzettaUfficiale: norma.gazzettaUfficiale || "",
    });
  };

  // Generate unique years from data
  const years = Array.from(new Set(norme.map(n => n.anno))).sort((a, b) => b - a);

  // Filter norme by search
  const filteredNorme = norme.filter(n =>
    !searchTerm ||
    n.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.titoloBreve?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.numero?.includes(searchTerm)
  );

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Normativa</h2>
            <p className="text-muted-foreground">Gestisci l'indice delle norme e regolamenti.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi Norma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Aggiungi nuova norma</DialogTitle>
                <DialogDescription>
                  Inserisci i metadati della norma per aggiungerla all'indice.
                </DialogDescription>
              </DialogHeader>
              <NormaForm formData={formData} setFormData={setFormData} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Crea
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
                <Scale className="h-5 w-5" />
                Indice Norme ({filteredNorme.length})
              </CardTitle>
              <div className="flex items-center gap-4">
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo norma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    {TIPI_NORMA.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterAnno} onValueChange={setFilterAnno}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca norma..."
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
                    <TableHead>Norma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Anno</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNorme.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nessuna norma trovata.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNorme.map((norma) => (
                      <TableRow key={norma.id}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                            <div>
                              <p className="font-medium line-clamp-2">{norma.titolo}</p>
                              {norma.titoloBreve && (
                                <p className="text-sm text-muted-foreground">"{norma.titoloBreve}"</p>
                              )}
                              {norma.numero && (
                                <p className="text-xs text-muted-foreground">n. {norma.numero}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{norma.tipo}</Badge>
                        </TableCell>
                        <TableCell>{norma.anno}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {norma.keywords?.slice(0, 3).map((k, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                            ))}
                            {(norma.keywords?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">+{norma.keywords!.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <a
                            href={norma.urlNormattiva}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Normattiva
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Modifica"
                              onClick={() => openEditDialog(norma)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Elimina"
                              onClick={() => {
                                if (confirm('Eliminare questa norma?')) {
                                  deleteMutation.mutate(norma.id);
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
        <Dialog open={!!editingNorma} onOpenChange={() => setEditingNorma(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifica norma</DialogTitle>
            </DialogHeader>
            <NormaForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingNorma(null)}>Annulla</Button>
              <Button
                onClick={() => {
                  if (editingNorma) {
                    updateMutation.mutate({
                      id: editingNorma.id,
                      data: {
                        ...formData,
                        anno: parseInt(String(formData.anno)),
                        keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                      } as any
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

// Form component for create/edit
function NormaForm({
  formData,
  setFormData
}: {
  formData: typeof emptyNorma;
  setFormData: (data: typeof emptyNorma) => void;
}) {
  return (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>URN (identificativo) *</Label>
          <Input
            value={formData.urn}
            onChange={(e) => setFormData({ ...formData, urn: e.target.value })}
            placeholder="urn:nir:stato:legge:2003-06-30;196"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPI_NORMA.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Numero</Label>
          <Input
            value={formData.numero}
            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
            placeholder="es. 196"
          />
        </div>
        <div className="space-y-2">
          <Label>Anno *</Label>
          <Input
            type="number"
            value={formData.anno}
            onChange={(e) => setFormData({ ...formData, anno: parseInt(e.target.value) || 2024 })}
            min={1800}
            max={2100}
          />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            placeholder="2003-06-30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Titolo completo *</Label>
        <Textarea
          value={formData.titolo}
          onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
          placeholder="Codice in materia di protezione dei dati personali"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Titolo breve</Label>
        <Input
          value={formData.titoloBreve}
          onChange={(e) => setFormData({ ...formData, titoloBreve: e.target.value })}
          placeholder="es. Codice Privacy"
        />
      </div>

      <div className="space-y-2">
        <Label>URL Normattiva *</Label>
        <Input
          value={formData.urlNormattiva}
          onChange={(e) => setFormData({ ...formData, urlNormattiva: e.target.value })}
          placeholder="https://www.normattiva.it/uri-res/N2Ls?urn:nir:..."
        />
      </div>

      <div className="space-y-2">
        <Label>Keywords (separate da virgola)</Label>
        <Input
          value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="privacy, dati personali, gdpr"
        />
      </div>

      <div className="space-y-2">
        <Label>Gazzetta Ufficiale</Label>
        <Input
          value={formData.gazzettaUfficiale}
          onChange={(e) => setFormData({ ...formData, gazzettaUfficiale: e.target.value })}
          placeholder="GU Serie Generale n.174 del 29-07-2003"
        />
      </div>
    </div>
  );
}
