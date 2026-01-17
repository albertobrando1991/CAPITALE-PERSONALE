import { useState } from "react";
import { Link, useSearch, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  BookOpen,
  Upload,
  FileText,
  Sparkles,
  Layers,
  Plus,
  Loader2,
  CheckCircle,
  Brain,
  Target,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Concorso, Material, Flashcard } from "@shared/schema";

interface BandoData {
  materie?: Array<{ nome: string; microArgomenti?: string[] }>;
}

export default function Phase2Page() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Support both new route param and old query param
  const [match, params] = useRoute("/concorsi/:concorsoId/fase2");
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const concorsoId = match ? params.concorsoId : searchParams.get("id");

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    nome: "",
    tipo: "appunti",
    materia: "",
    contenuto: "",
  });
  
  const [deleteMateriaDialogOpen, setDeleteMateriaDialogOpen] = useState(false);
  const [materiaToDelete, setMateriaToDelete] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: concorso, isLoading: loadingConcorso } = useQuery<Concorso>({
    queryKey: ["/api/concorsi", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/concorsi/${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch concorso");
      return res.json();
    },
    enabled: !!concorsoId,
  });

  const { data: materials = [], isLoading: loadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/materials", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/materials?concorsoId=${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch materials");
      return res.json();
    },
    enabled: !!concorsoId,
  });

  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ["/api/flashcards", concorsoId],
    queryFn: async () => {
      const res = await fetch(`/api/flashcards?concorsoId=${concorsoId}`);
      if (!res.ok) throw new Error("Failed to fetch flashcards");
      return res.json();
    },
    enabled: !!concorsoId,
  });

  const addMaterialMutation = useMutation({
    mutationFn: async (data: typeof newMaterial) => {
      return apiRequest("POST", "/api/materials", {
        ...data,
        concorsoId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials", concorsoId] });
      toast({ title: "Materiale aggiunto" });
      setAddDialogOpen(false);
      setNewMaterial({ nome: "", tipo: "appunti", materia: "", contenuto: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere materiale", variant: "destructive" });
    },
  });

  const getAcceptTypes = (tipo: string) => {
    switch (tipo) {
      case "video":
      case "audio":
        return "video/*,audio/*,.mp4,.avi,.mov,.mp3,.wav";
      case "libro":
      case "dispensa":
        return ".pdf,.doc,.docx,.txt";
      case "appunti":
        return ".pdf,.doc,.docx,.txt";
      default:
        return "*/*";
    }
  };

  const uploadMaterialMutation = useMutation({
    mutationFn: async (file: File) => {
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isText =
        file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");

      if (isPdf || isText) {
        let contenuto = "";

        if (isPdf) {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
          const pdfDocument = await loadingTask.promise;

          const maxChars = 30000;
          const maxPages = Math.min(pdfDocument.numPages, 30);

          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[])
              .map((item: any) => item?.str ?? "")
              .join(" ");
            contenuto += pageText + "\n";
            if (contenuto.length >= maxChars) break;
          }

          contenuto = contenuto.slice(0, maxChars);

          if (contenuto.trim().length < 500) {
            const ocrPages = async (pageNums: number[]) => {
              const images: Array<{ base64: string; mimeType: string }> = [];

              for (const pageNum of pageNums) {
                const page = await pdfDocument.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.25 });
                const canvas = document.createElement("canvas");
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                const ctx = canvas.getContext("2d");
                if (!ctx) continue;

                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                const base64 = dataUrl.split(",")[1] || "";
                if (!base64) continue;

                images.push({ base64, mimeType: "image/jpeg" });
              }

              if (!images.length) return "";

              const ocrRes = await fetch("/api/ocr/images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ images }),
              });

              if (!ocrRes.ok) {
                let msg = `OCR fallito (${ocrRes.status})`;
                try {
                  const data = await ocrRes.json();
                  msg = data?.error || data?.details || msg;
                } catch {}
                throw new Error(msg);
              }

              const data = await ocrRes.json();
              return String(data?.text || "");
            };

            let ocrText = "";
            const totalPages = pdfDocument.numPages;

            ocrText += await ocrPages([1, Math.min(2, totalPages)].filter(Boolean));
            if (ocrText.trim().length < 500 && totalPages >= 4) {
              ocrText += "\n" + (await ocrPages([3, 4]));
            }

            contenuto = ocrText.slice(0, maxChars);
          }
        } else {
          contenuto = (await file.text()).slice(0, 30000);
        }

        if (contenuto.trim().length < 500) {
          throw new Error(
            "Testo insufficiente. Il PDF sembra scannerizzato. Riprova: OCR automatico sulle prime pagine oppure incolla il testo negli appunti."
          );
        }

        const res = await apiRequest("POST", "/api/materials", {
          concorsoId,
          nome: newMaterial.nome || file.name,
          tipo: newMaterial.tipo,
          materia: newMaterial.materia,
          contenuto,
          estratto: true,
        });

        return res.json();
      }

      const maxUploadBytes = 4 * 1024 * 1024;
      if (file.size > maxUploadBytes) {
        throw new Error(
          "File troppo grande per l'upload su Vercel. Usa un PDF/TXT più piccolo oppure incolla il testo come appunti."
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("concorsoId", concorsoId || "");
      formData.append("nome", newMaterial.nome);
      formData.append("tipo", newMaterial.tipo);
      formData.append("materia", newMaterial.materia);

      const res = await fetch("/api/upload-material", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error(
            "File troppo grande per l'upload su Vercel. Usa un PDF/TXT più piccolo oppure incolla il testo come appunti."
          );
        }
        throw new Error("Impossibile caricare il file");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials", concorsoId] });
      toast({ title: "Materiale caricato con successo" });
      setAddDialogOpen(false);
      setNewMaterial({ nome: "", tipo: "appunti", materia: "", contenuto: "" });
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile caricare il file",
        variant: "destructive",
      });
    },
  });

  const handleSaveMaterial = () => {
    if (selectedFile) {
      uploadMaterialMutation.mutate(selectedFile);
    } else {
      addMaterialMutation.mutate(newMaterial);
    }
  };

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials", concorsoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards", concorsoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      toast({ title: "Materiale eliminato" });
    },
  });
  
  const deleteMateriaFlashcardsMutation = useMutation({
    mutationFn: async (materia: string) => {
      return apiRequest("DELETE", "/api/flashcards/materia", {
        concorsoId,
        materia,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards", concorsoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials", concorsoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      toast({ title: "Flashcard eliminate", description: "Le flashcard della materia sono state eliminate." });
      setDeleteMateriaDialogOpen(false);
      setMateriaToDelete(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare le flashcard", variant: "destructive" });
    },
  });

  const confirmDeleteMateria = () => {
    if (materiaToDelete) {
      deleteMateriaFlashcardsMutation.mutate(materiaToDelete);
    }
  };

  const generateFlashcardsMutation = useMutation({
    mutationFn: async (materialId: string) => {
      setIsGenerating(materialId);
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, concorsoId }),
      });
      if (!res.ok) throw new Error("Failed to generate flashcards");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards", concorsoId] });
      queryClient.invalidateQueries({ queryKey: ["/api/materials", concorsoId] });
      toast({
        title: "Flashcard generate",
        description: `${data.count || 0} flashcard create con successo.`,
      });
      setIsGenerating(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare flashcard", variant: "destructive" });
      setIsGenerating(null);
    },
  });

  

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const bandoData = concorso?.bandoAnalysis as BandoData | null;
  const materie = bandoData?.materie || [];
  
  // Lista predefinita di materie per concorsi pubblici
  const DEFAULT_MATERIE = [
    "Diritto costituzionale",
    "Diritto amministrativo",
    "Diritto civile",
    "Diritto penale",
    "Diritto processuale civile",
    "Diritto processuale penale",
    "Diritto commerciale",
    "Diritto tributario",
    "Diritto del lavoro / diritto sindacale",
    "Diritto dell’Unione Europea",
    "Legislazione nazionale e regionale",
    "Normativa sulla trasparenza e anticorruzione",
    "Codice dei contratti pubblici",
    "Contabilità pubblica",
    "Ragioneria generale e applicata",
    "Economia politica / Scienza delle finanze",
    "Bilancio dello Stato e degli Enti Locali",
    "Gestione delle risorse finanziarie e controllo di gestione",
    "Ingegneria civile / infrastrutture",
    "Ingegneria elettronica / informatica",
    "Architettura e urbanistica",
    "Agraria / forestale / ambiente",
    "Informatica (programmazione, reti, sicurezza)",
    "Statistica e metodologia della ricerca",
    "Tecniche di comunicazione e gestione documentale",
    "Sicurezza sul lavoro (D.Lgs. 81/08)",
    "Protezione civile e gestione emergenze",
    "Lingua italiana e comprensione testuale",
    "Lingue straniere",
    "Cultura generale / storia / geografia",
    "Ordinamenti delle Forze Armate / Polizia",
    "Tecniche investigative e sicurezza",
    "Psicologia applicata alle Forze dell’Ordine",
    "Educazione fisica",
    "Pedagogia e didattica",
    "Metodologia dell’insegnamento",
    "Psicologia dell’apprendimento",
    "Logica e ragionamento critico",
    "Quiz di cultura generale",
    "Matematica di base e ragionamento numerico",
    "Problem solving",
    "Informatica di base"
  ];

  // Combina le materie del bando con quelle di default, rimuove duplicati e "Generale"
  const allMaterie = Array.from(new Set([
    ...materie.map(m => m.nome),
    ...DEFAULT_MATERIE
  ])).filter(nome => nome !== 'Generale').sort();

  const totalFlashcards = flashcards.length;
  const materialsWithFlashcards = materials.filter((m) => (m.flashcardGenerate || 0) > 0).length;

  if (!concorsoId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p>Nessun concorso selezionato. Torna alla dashboard.</p>
            <Link href="/">
              <Button className="mt-4">Vai alla Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingConcorso) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!concorso?.bandoAnalysis) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-secondary/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-secondary" />
              <div>
                <h3 className="font-semibold text-lg">Completa prima la Fase 0</h3>
                <p className="text-muted-foreground mt-1">
                  Devi analizzare il bando prima di procedere con l'acquisizione dei materiali.
                </p>
                <Link href={`/concorsi/${concorsoId}/fase0`}>
                  <Button className="mt-4">Vai alla Fase 0</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold" data-testid="text-phase2-title">
            FASE 2: Acquisizione Strategica
          </h1>
          <p className="text-muted-foreground mt-1">{concorso.nome}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{materials.length}</p>
              <p className="text-sm text-muted-foreground">Materiali</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-status-online/10 rounded-lg">
              <Layers className="h-6 w-6 text-status-online" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFlashcards}</p>
              <p className="text-sm text-muted-foreground">Flashcard Generate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{materie.length}</p>
              <p className="text-sm text-muted-foreground">Materie dal Bando</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <FileText className="h-4 w-4 mr-2" />
            Materiali
          </TabsTrigger>
          <TabsTrigger value="materie" data-testid="tab-materie">
            <BookOpen className="h-4 w-4 mr-2" />
            Materie
          </TabsTrigger>
          <TabsTrigger value="flashcards" data-testid="tab-flashcards">
            <Layers className="h-4 w-4 mr-2" />
            Flashcard ({totalFlashcards})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold">I tuoi Materiali di Studio</h2>
            <div className="flex gap-2">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-material">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Materiale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Nuovo Materiale</DialogTitle>
                    <DialogDescription>
                      Inserisci i dettagli del materiale da aggiungere alla tua libreria di studio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        value={newMaterial.nome}
                        onChange={(e) => setNewMaterial({ ...newMaterial, nome: e.target.value })}
                        placeholder="Es: Appunti Diritto Amministrativo"
                        data-testid="input-material-nome"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select
                        value={newMaterial.tipo}
                        onValueChange={(v) => {
                          setNewMaterial({ ...newMaterial, tipo: v });
                          setSelectedFile(null);
                        }}
                      >
                        <SelectTrigger data-testid="select-material-tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appunti">Appunti</SelectItem>
                          <SelectItem value="libro">Libro/Manuale</SelectItem>
                          <SelectItem value="dispensa">Dispensa</SelectItem>
                          <SelectItem value="video">Video/Corso</SelectItem>
                          <SelectItem value="audio">Podcast/Audio</SelectItem>
                          <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Materia</label>
                      <Select
                        value={newMaterial.materia}
                        onValueChange={(v) => setNewMaterial({ ...newMaterial, materia: v })}
                      >
                        <SelectTrigger data-testid="select-material-materia">
                          <SelectValue placeholder="Seleziona materia" />
                        </SelectTrigger>
                        <SelectContent>
                          {allMaterie.map((nome) => (
                            <SelectItem key={nome} value={nome}>
                              {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(newMaterial.tipo === "libro" || newMaterial.tipo === "dispensa" || newMaterial.tipo === "video" || newMaterial.tipo === "audio") && (
                      <div>
                        <label className="text-sm font-medium">Carica File ({newMaterial.tipo})</label>
                        <Input
                          type="file"
                          accept={getAcceptTypes(newMaterial.tipo)}
                          onChange={handleFileUpload}
                          className="cursor-pointer"
                          data-testid="input-material-file"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Formati accettati: {getAcceptTypes(newMaterial.tipo)}
                        </p>
                      </div>
                    )}

                    {(newMaterial.tipo === "appunti" || newMaterial.tipo === "altro") && (
                      <div>
                        <label className="text-sm font-medium">Contenuto o File</label>
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept={getAcceptTypes(newMaterial.tipo)}
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                            data-testid="input-material-file"
                          />
                          <div className="text-center text-xs text-muted-foreground">- OPPURE -</div>
                          <Textarea
                            value={newMaterial.contenuto}
                            onChange={(e) => setNewMaterial({ ...newMaterial, contenuto: e.target.value })}
                            placeholder="Incolla qui il testo dei tuoi appunti..."
                            rows={6}
                            disabled={!!selectedFile}
                            data-testid="textarea-material-contenuto"
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleSaveMaterial}
                      disabled={!newMaterial.nome || (addMaterialMutation.isPending || uploadMaterialMutation.isPending)}
                      data-testid="button-save-material"
                    >
                      {(addMaterialMutation.isPending || uploadMaterialMutation.isPending) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Salva Materiale
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {loadingMaterials ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Nessun materiale</h3>
                <p className="text-muted-foreground mt-1">
                  Aggiungi materiali di studio per generare flashcard con l'AI.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((material) => (
                <Card key={material.id} data-testid={`card-material-${material.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{material.nome}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{material.tipo}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteMaterialMutation.mutate(material.id)}
                          data-testid={`button-delete-material-${material.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {material.materia && (
                      <Badge variant="secondary">{material.materia}</Badge>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Flashcard generate: {material.flashcardGenerate || 0}
                      </span>
                      {(material.flashcardGenerate || 0) > 0 && (
                        <CheckCircle className="h-4 w-4 text-status-online" />
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => generateFlashcardsMutation.mutate(material.id)}
                      disabled={isGenerating === material.id || !material.contenuto}
                      data-testid={`button-generate-flashcards-${material.id}`}
                    >
                      {isGenerating === material.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Genera Flashcard AI
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="materie" className="space-y-4">
          <h2 className="text-xl font-semibold">Materie Estratte dal Bando</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materie.map((materia, index) => {
              const materiaFlashcards = flashcards.filter((f) => f.materia === materia.nome).length;
              const materiaMaterials = materials.filter((m) => m.materia === materia.nome).length;
              return (
                <Card key={index} data-testid={`card-materia-${index}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      {materia.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Materiali:</span>
                      <span className="font-medium">{materiaMaterials}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Flashcard:</span>
                      <span className="font-medium">{materiaFlashcards}</span>
                    </div>
                    {materia.microArgomenti && materia.microArgomenti.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-1">Argomenti:</p>
                        <div className="flex flex-wrap gap-1">
                          {materia.microArgomenti.slice(0, 3).map((arg, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {arg}
                            </Badge>
                          ))}
                          {materia.microArgomenti.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{materia.microArgomenti.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Flashcard Generate</h2>
            {flashcards.length > 0 && (
              <Link href={`/flashcards?concorsoId=${concorsoId}`}>
                <Button data-testid="button-study-flashcards">
                  <Layers className="h-4 w-4 mr-2" />
                  Inizia Studio
                </Button>
              </Link>
            )}
          </div>

          {flashcards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">Nessuna flashcard</h3>
                <p className="text-muted-foreground mt-1">
                  Aggiungi materiali e genera flashcard con l'AI per iniziare a studiare.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(
                  flashcards.reduce((acc, f) => {
                    acc[f.materia] = (acc[f.materia] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([materia, count]) => (
                  <Card key={materia}>
                    <CardContent className="p-4 relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-6 w-6 text-destructive hover:bg-destructive/10"
                           onClick={(e) => {
                             e.preventDefault();
                             setMateriaToDelete(materia);
                             setDeleteMateriaDialogOpen(true);
                           }}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                      <p className="text-sm text-muted-foreground truncate pr-6">{materia}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progresso Flashcard</span>
                    <span className="text-sm text-muted-foreground">
                      {flashcards.filter((f) => f.masterate).length} / {flashcards.length} masterate
                    </span>
                  </div>
                  <Progress
                    value={(flashcards.filter((f) => f.masterate).length / flashcards.length) * 100}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <AlertDialog open={deleteMateriaDialogOpen} onOpenChange={setDeleteMateriaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare flashcard di "{materiaToDelete}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare tutte le flashcard associate alla materia "{materiaToDelete}".
              Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMateria}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMateriaFlashcardsMutation.isPending ? "Eliminazione..." : "Elimina tutto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
