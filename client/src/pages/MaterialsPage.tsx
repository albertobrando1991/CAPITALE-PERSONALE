import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MaterialCard } from "@/components/MaterialCard";
import { UploadMaterial } from "@/components/UploadMaterial";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, BookOpen } from "lucide-react";

interface Material {
  id: string;
  title: string;
  type: "normativa" | "giurisprudenza" | "manuale";
  status: "pending" | "processing" | "completed";
  flashcardsCount: number;
  quizzesCount: number;
}

// todo: remove mock functionality
const mockMaterials: Material[] = [
  {
    id: "1",
    title: "Legge 241/1990 - Procedimento Amministrativo",
    type: "normativa" as const,
    status: "completed" as const,
    flashcardsCount: 45,
    quizzesCount: 3,
  },
  {
    id: "2",
    title: "D.Lgs. 165/2001 - TUPI",
    type: "normativa" as const,
    status: "completed" as const,
    flashcardsCount: 62,
    quizzesCount: 4,
  },
  {
    id: "3",
    title: "Costituzione Italiana - Parte I",
    type: "normativa" as const,
    status: "processing" as const,
    flashcardsCount: 0,
    quizzesCount: 0,
  },
  {
    id: "4",
    title: "Manuale di Diritto Amministrativo",
    type: "manuale" as const,
    status: "completed" as const,
    flashcardsCount: 120,
    quizzesCount: 8,
  },
  {
    id: "5",
    title: "Sentenza Corte Cost. 238/2014",
    type: "giurisprudenza" as const,
    status: "completed" as const,
    flashcardsCount: 15,
    quizzesCount: 1,
  },
  {
    id: "6",
    title: "D.Lgs. 33/2013 - Trasparenza",
    type: "normativa" as const,
    status: "pending" as const,
    flashcardsCount: 0,
    quizzesCount: 0,
  },
];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState(mockMaterials);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    console.log("Deleted material:", id);
  };

  const handleUpload = async (file: File, title: string, type: string) => {
    console.log("Uploading:", file.name, title, type);
    // todo: remove mock functionality
    await new Promise((r) => setTimeout(r, 1500));
    setMaterials((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title,
        type: type as "normativa" | "giurisprudenza" | "manuale",
        status: "processing" as const,
        flashcardsCount: 0,
        quizzesCount: 0,
      },
    ]);
    setIsUploadOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Materiali</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i tuoi materiali di studio
          </p>
        </div>
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
              <DialogDescription>
                Modulo per il caricamento di un nuovo materiale di studio (PDF)
              </DialogDescription>
            </div>
            <UploadMaterial
              onUpload={handleUpload}
              onCancel={() => setIsUploadOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca materiali..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-materials"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="normativa">Normativa</SelectItem>
            <SelectItem value="giurisprudenza">Giurisprudenza</SelectItem>
            <SelectItem value="manuale">Manuale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              {...material}
              onView={(id) => console.log("View:", id)}
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
              : "Carica il tuo primo materiale di studio per iniziare"
          }
          actionLabel={!search && typeFilter === "all" ? "Carica Materiale" : undefined}
          onAction={
            !search && typeFilter === "all"
              ? () => setIsUploadOpen(true)
              : undefined
          }
        />
      )}
    </div>
  );
}
