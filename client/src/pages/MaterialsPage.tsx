import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiFetch } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogHeader
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MaterialCard } from "@/components/MaterialCard";
import { UploadMaterial } from "@/components/UploadMaterial";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, BookOpen, PenBox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Concorso {
  id: string;
  nome: string;
  tipo: string;
}

export default function MaterialsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Note State
  const [noteConcorsoId, setNoteConcorsoId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteMateria, setNoteMateria] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // View State
  const [viewingMaterial, setViewingMaterial] = useState<any>(null);

  // Upload State
  const [uploadConcorsoId, setUploadConcorsoId] = useState("");

  // Data Fetching
  const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/materials");
      return res.json();
    }
  });

  const { data: concorsi = [] } = useQuery({
    queryKey: ["/api/concorsi"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/concorsi");
      return res.json();
    }
  });

  // Derived Data
  const filteredMaterials = (materials as any[]).filter((m: any) => {
    const matchesSearch = m.nome.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || m.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteConcorsoId) throw new Error("Seleziona un concorso");
      await apiRequest("POST", "/api/materials/note", {
        concorsoId: noteConcorsoId,
        nome: noteTitle,
        materia: noteMateria || "Note Personali",
        contenuto: noteContent
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsNoteOpen(false);
      setNoteConcorsoId("");
      setNoteTitle("");
      setNoteMateria("");
      setNoteContent("");
      toast({ title: "Nota creata con successo", description: "La tua nota è stata salvata tra i materiali." });
    },
    onError: (e: Error) => {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
  });

  const handleCreateNote = () => {
    if (!noteTitle || !noteContent || !noteConcorsoId) {
      toast({ title: "Attenzione", description: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    createNoteMutation.mutate();
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, type }: { file: File; title: string; type: string }) => {
      if (!uploadConcorsoId) throw new Error("Seleziona un concorso prima di caricare");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("concorsoId", uploadConcorsoId);
      formData.append("nome", title);
      formData.append("tipo", type);
      formData.append("materia", "Generale");

      const res = await apiFetch("/api/upload-material", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setIsUploadOpen(false);
      setUploadConcorsoId("");
      toast({ title: "Materiale caricato", description: "Il file è stato aggiunto ai tuoi materiali." });
    },
    onError: (e: Error) => {
      toast({ title: "Errore upload", description: e.message, variant: "destructive" });
    }
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo materiale?")) return;
    try {
      await apiRequest("DELETE", `/api/materials/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({ title: "Eliminato", description: "Materiale rimosso correttamente" });
    } catch (e: any) {
      toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" });
    }
  };

  const handleView = async (material: any) => {
    if (material.fileUrl) {
      // Logic for File/PDF View
      if (material.fileUrl.startsWith("http") || material.fileUrl.startsWith("/uploads")) {
        // Public/Local URL
        window.open(material.fileUrl, "_blank");
      } else {
        // Supabase Storage Path - Request Signed URL
        try {
          const res = await apiFetch("/api/storage/signed-download-url", {
            method: "POST",
            body: JSON.stringify({ path: material.fileUrl })
          });
          if (!res.ok) throw new Error("Errore recupero file");
          const data = await res.json();
          window.open(data.signedUrl, "_blank");
        } catch (e) {
          toast({ title: "Errore", description: "Impossibile aprire il file", variant: "destructive" });
        }
      }
    } else if (material.contenuto) {
      setViewingMaterial(material);
    } else {
      toast({ title: "Info", description: "Nessun contenuto visualizzabile per questo materiale." });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Fonti e Materiali</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i tuoi materiali, libri, dispense e appunti personali
          </p>
        </div>
        <div className="flex gap-2">
          {/* NEW NOTE DIALOG */}
          <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-note">
                <PenBox className="h-4 w-4 mr-2" />
                Nuova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Crea Nota Personale</DialogTitle>
                <DialogDescription>
                  Aggiungi appunti testuali alle tue fonti.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Concorso di riferimento</Label>
                  <Select value={noteConcorsoId} onValueChange={setNoteConcorsoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona Concorso" />
                    </SelectTrigger>
                    <SelectContent>
                      {(concorsi as Concorso[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Materia / Argomento</Label>
                  <Input
                    placeholder="Es. Diritto Amministrativo"
                    value={noteMateria}
                    onChange={(e) => setNoteMateria(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titolo della Nota</Label>
                  <Input
                    placeholder="Titolo identificativo"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenuto</Label>
                  <Textarea
                    placeholder="Scrivi o incolla qui i tuoi appunti..."
                    className="min-h-[200px]"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="ghost" onClick={() => setIsNoteOpen(false)}>Annulla</Button>
                  <Button
                    onClick={handleCreateNote}
                    disabled={createNoteMutation.isPending}
                  >
                    {createNoteMutation.isPending ? "Salvataggio..." : "Salva Nota"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* UPLOAD DIALOG */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-material">
                <Plus className="h-4 w-4 mr-2" />
                Carica Materiale
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
              <div className="sr-only">
                <DialogTitle>Carica Materiale</DialogTitle>
                <DialogDescription>PDF Upload</DialogDescription>
              </div>
              <div className="p-6 pb-0">
                <Label className="mb-2 block">Seleziona Concorso</Label>
                <Select value={uploadConcorsoId} onValueChange={setUploadConcorsoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli concorso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(concorsi as Concorso[]).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!uploadConcorsoId && <p className="text-xs text-muted-foreground mt-1">Seleziona un concorso per abilitare il caricamento</p>}
              </div>

              <div className={!uploadConcorsoId ? "opacity-50 pointer-events-none" : ""}>
                <UploadMaterial
                  onUpload={(file, title, type) => uploadMutation.mutateAsync({ file, title, type })}
                  onCancel={() => setIsUploadOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>


          {/* VIEW NOTE DIALOG */}
          <Dialog open={!!viewingMaterial} onOpenChange={(open) => !open && setViewingMaterial(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewingMaterial?.nome || "Dettaglio Nota"}</DialogTitle>
                <DialogDescription>
                  {viewingMaterial?.materia} - {viewingMaterial?.tipo === 'appunti' ? 'Nota Personale' : 'Contenuto'}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-mono text-sm">
                {viewingMaterial?.contenuto}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca materiali..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="normativa">Normativa</SelectItem>
            <SelectItem value="giurisprudenza">Giurisprudenza</SelectItem>
            <SelectItem value="manuale">Manuale</SelectItem>
            <SelectItem value="appunti">Appunti Personali</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {
        isLoadingMaterials ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Caricamento materiali...</p>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((material: any) => (
              <MaterialCard
                key={material.id}
                id={material.id}
                title={material.nome}
                type={material.tipo}
                status={(material.estratto || material.tipo === 'appunti') ? "completed" : "processing"}
                flashcardsCount={material.flashcardGenerate || 0}
                quizzesCount={0}
                onView={() => handleView(material)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Nessun materiale trovato"
            description={
              search || typeFilter !== "all"
                ? "Prova a modificare i filtri di ricerca"
                : "Carica il tuo primo materiale o crea una nota per iniziare"
            }
            actionLabel={!search && typeFilter === "all" ? "Crea Nota" : undefined}
            onAction={
              !search && typeFilter === "all"
                ? () => setIsNoteOpen(true)
                : undefined
            }
          />
        )
      }
    </div >
  );
}
