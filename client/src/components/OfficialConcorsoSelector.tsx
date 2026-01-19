import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Loader2,
  Building2,
  Calendar,
  Users,
  ExternalLink,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { OfficialConcorso } from "@shared/schema";

interface OfficialConcorsoSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (concorso: OfficialConcorso) => void;
  onUploadBando: () => void;
}

export function OfficialConcorsoSelector({
  open,
  onOpenChange,
  onSelect,
  onUploadBando,
}: OfficialConcorsoSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: officialConcorsi = [], isLoading } = useQuery<OfficialConcorso[]>({
    queryKey: ["official-concorsi-public"],
    queryFn: async () => {
      const res = await fetch("/api/official-concorsi");
      if (!res.ok) throw new Error("Errore caricamento catalogo");
      return res.json();
    },
    enabled: open,
  });

  const filteredConcorsi = officialConcorsi.filter(
    (c) =>
      !searchTerm ||
      c.titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isDeadlineClose = (date: string | Date | null | undefined) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Aggiungi Nuovo Concorso
          </DialogTitle>
          <DialogDescription>
            Scegli un concorso dal catalogo ufficiale o carica il tuo bando PDF
          </DialogDescription>
        </DialogHeader>

        {/* Options: Upload Bando or Select from Catalog */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              onOpenChange(false);
              onUploadBando();
            }}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Carica Bando PDF</h3>
              <p className="text-xs text-muted-foreground">
                Carica il PDF del bando e lascia che l'AI lo analizzi
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-primary/20 rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Scegli dal Catalogo</h3>
              <p className="text-xs text-muted-foreground">
                Concorsi già analizzati dallo staff con dati pre-compilati
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per ente o titolo..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Concorsi List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConcorsi.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? (
                <>
                  <p>Nessun concorso trovato per "{searchTerm}"</p>
                  <p className="text-sm mt-2">Prova a caricare il bando PDF</p>
                </>
              ) : (
                <>
                  <p>Il catalogo è vuoto</p>
                  <p className="text-sm mt-2">Carica il bando PDF per iniziare</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredConcorsi.map((concorso) => (
                <Card
                  key={concorso.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                  onClick={() => onSelect(concorso)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {concorso.imageUrl ? (
                          <AvatarImage src={concorso.imageUrl} alt={concorso.ente} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {concorso.ente.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{concorso.titolo}</h3>
                            <p className="text-sm text-muted-foreground">{concorso.ente}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="flex-shrink-0">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>

                        {concorso.descrizione && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {concorso.descrizione}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {concorso.posti && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {concorso.posti} posti
                            </Badge>
                          )}

                          {concorso.scadenzaDomanda && (
                            <Badge
                              variant={isDeadlineClose(concorso.scadenzaDomanda) ? "destructive" : "outline"}
                              className="text-xs"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Scad. {formatDate(concorso.scadenzaDomanda)}
                            </Badge>
                          )}

                          {concorso.linkPaginaUfficiale && (
                            <a
                              href={concorso.linkPaginaUfficiale}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              inPA
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
