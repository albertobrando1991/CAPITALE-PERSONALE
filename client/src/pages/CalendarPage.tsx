import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, parse, isWithinInterval, isValid, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ArrowLeft, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, Save, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Concorso, CalendarEventItem } from "@shared/schema";

interface CalendarEvent {
  id: string;
  concorsoId?: string;
  concorsoNome?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: "phase" | "deadline" | "exam" | "note" | "activity";
  color: string;
  isCustom?: boolean; // Flag per distinguere eventi custom
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newNote, setNewNote] = useState("");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch concorsi
  const { data: concorsi, isLoading: isLoadingConcorsi } = useQuery<Concorso[]>({
    queryKey: ["/api/concorsi"],
  });

  // Fetch custom events
  const { data: customEvents, isLoading: isLoadingEvents } = useQuery<CalendarEventItem[]>({
    queryKey: ["/api/calendar/events"],
  });

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (eventData: { date: Date, title: string, description?: string, type: string }) => {
      const res = await apiRequest("POST", "/api/calendar/events", eventData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Attività aggiunta", description: "La nota è stata salvata correttamente." });
      setNewNote("");
      setNewActivityTitle("");
      setIsAddingNote(false);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Eliminato", description: "Attività rimossa dal calendario." });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const handleAddNote = () => {
    if (!date) return;
    if (!newActivityTitle.trim()) {
      toast({ title: "Titolo richiesto", description: "Inserisci un titolo per l'attività.", variant: "destructive" });
      return;
    }
    
    createEventMutation.mutate({
      date: date,
      title: newActivityTitle,
      description: newNote,
      type: "note"
    });
  };

  // Process data to create events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    
    // 1. Concorsi Events
    if (concorsi) {
      const colors = [
        "bg-primary", "bg-secondary", "bg-indigo-700", "bg-orange-500", "bg-pink-600", "bg-teal-600"
      ];

      concorsi.forEach((concorso, index) => {
        const color = colors[index % colors.length];
        const bandoAnalysis = concorso.bandoAnalysis as any;

        // Fasi dal calendario inverso
        if (bandoAnalysis?.calendarioInverso && Array.isArray(bandoAnalysis.calendarioInverso)) {
          bandoAnalysis.calendarioInverso.forEach((fase: any, fIndex: number) => {
            try {
              const start = parse(fase.dataInizio, "dd/MM/yyyy", new Date());
              const end = parse(fase.dataFine, "dd/MM/yyyy", new Date());

              if (isValid(start) && isValid(end)) {
                allEvents.push({
                  id: `${concorso.id}-phase-${fIndex}`,
                  concorsoId: concorso.id,
                  concorsoNome: concorso.nome,
                  title: fase.fase,
                  startDate: start,
                  endDate: end,
                  type: "phase",
                  color: color
                });
              }
            } catch (e) {
              console.error("Error parsing date for phase", fase, e);
            }
          });
        }

        // Scadenze
        if (concorso.scadenzaDomanda) {
          try {
            const deadline = new Date(concorso.scadenzaDomanda);
            if (isValid(deadline)) {
               allEvents.push({
                  id: `${concorso.id}-deadline`,
                  concorsoId: concorso.id,
                  concorsoNome: concorso.nome,
                  title: "Scadenza Domanda",
                  startDate: deadline,
                  endDate: deadline,
                  type: "deadline",
                  color: "bg-red-500"
                });
            }
          } catch (e) {}
        }

        if (concorso.dataPresuntaEsame) {
           try {
            const examDate = new Date(concorso.dataPresuntaEsame);
            if (isValid(examDate)) {
               allEvents.push({
                  id: `${concorso.id}-exam`,
                  concorsoId: concorso.id,
                  concorsoNome: concorso.nome,
                  title: "Data Presunta Esame",
                  startDate: examDate,
                  endDate: examDate,
                  type: "exam",
                  color: "bg-red-600"
                });
            }
          } catch (e) {}
        }
      });
    }

    // 2. Custom Events (Note/Attività)
    if (customEvents) {
      customEvents.forEach(evt => {
        if (evt.date) {
          const evtDate = new Date(evt.date);
          allEvents.push({
            id: evt.id,
            concorsoId: evt.concorsoId || undefined,
            concorsoNome: "Personale",
            title: evt.title,
            description: evt.description || undefined,
            startDate: evtDate,
            endDate: evtDate,
            type: "note",
            color: "bg-slate-500",
            isCustom: true
          });
        }
      });
    }

    return allEvents;
  }, [concorsi, customEvents]);

  // Filter events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!date) return [];
    return events.filter(event => 
      isWithinInterval(date, { start: event.startDate, end: event.endDate }) ||
      isSameDay(date, event.startDate) || 
      isSameDay(date, event.endDate)
    );
  }, [date, events]);

  // Function to determine if a day has events (for calendar modifiers)
  const getDayContent = (day: Date) => {
    const dayEvents = events.filter(event => 
      isWithinInterval(day, { start: event.startDate, end: event.endDate })
    );

    if (dayEvents.length === 0) return null;

    return (
      <div className="w-full h-full flex items-end justify-center pb-1">
        <div className="flex gap-0.5">
          {dayEvents.slice(0, 3).map((evt, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${evt.color}`} />
          ))}
          {dayEvents.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          )}
        </div>
      </div>
    );
  };

  if (isLoadingConcorsi || isLoadingEvents) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-8 w-8" />
              Calendario Concorsi
            </h1>
            <p className="text-muted-foreground mt-1">
              Pianifica e monitora le fasi di studio di tutti i tuoi concorsi
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Calendar View */}
        <Card className="lg:col-span-8 flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col items-center justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm w-full max-w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-lg font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-14 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-visible:z-20",
                day: "h-14 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md flex flex-col items-center justify-start pt-2",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle:
                  "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: ({ className, ...props }) => (
                  <ChevronLeft className={`h-4 w-4 ${className}`} {...props} />
                ),
                IconRight: ({ className, ...props }) => (
                  <ChevronRight className={`h-4 w-4 ${className}`} {...props} />
                ),
                DayContent: ({ date: dayDate }) => (
                  <>
                    <span>{dayDate.getDate()}</span>
                    {getDayContent(dayDate)}
                  </>
                )
              }}
              locale={it}
            />
          </CardContent>
        </Card>

        {/* Side Panel: Events for selected date */}
        <Card className="lg:col-span-4 flex flex-col h-full max-h-[800px]">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {date ? format(date, "d MMMM yyyy", { locale: it }) : "Seleziona una data"}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length > 0 
                  ? `${selectedDateEvents.length} attività previste` 
                  : "Nessuna attività"}
              </CardDescription>
            </div>
            {date && (
               <Button size="sm" variant="outline" onClick={() => setIsAddingNote(!isAddingNote)}>
                 <Plus className="h-4 w-4 mr-1" /> Nota
               </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            
            {isAddingNote && (
              <div className="p-4 border-b bg-accent/20 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs">Titolo Attività</Label>
                  <Input 
                    id="title"
                    placeholder="Es. Ripasso Diritto Amministrativo" 
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="note" className="text-xs">Dettagli / Note</Label>
                  <Textarea 
                    id="note"
                    placeholder="Dettagli aggiuntivi..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="h-20 text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingNote(false)}>Annulla</Button>
                  <Button size="sm" onClick={handleAddNote} disabled={createEventMutation.isPending}>
                    {createEventMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Salva
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {selectedDateEvents.length === 0 && !isAddingNote && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Nessun impegno per oggi.</p>
                    <p className="text-sm mt-2">Goditi il riposo o ripassa argomenti precedenti!</p>
                  </div>
                )}

                {selectedDateEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors relative group"
                  >
                    {/* Delete button for custom events */}
                    {event.isCustom && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-6 w-6 text-muted-foreground hover:text-destructive"
                           onClick={() => {
                             if(confirm("Eliminare questa attività?")) {
                               deleteEventMutation.mutate(event.id);
                             }
                           }}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pr-6">
                      <Badge 
                        variant="outline" 
                        className={`${event.color} text-white border-0`}
                      >
                        {event.concorsoNome ? (
                          event.concorsoNome.substring(0, 20) + (event.concorsoNome.length > 20 ? '...' : '')
                        ) : "Attività"}
                      </Badge>
                      {event.type === 'deadline' && (
                        <Badge variant="destructive">Scadenza</Badge>
                      )}
                      {event.type === 'exam' && (
                        <Badge variant="destructive">Esame</Badge>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 italic border-l-2 pl-2 border-muted">
                          {event.description}
                        </p>
                      )}
                      {!event.isCustom && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Dal {format(event.startDate, "d MMM", { locale: it })} al {format(event.endDate, "d MMM yyyy", { locale: it })}
                        </p>
                      )}
                    </div>

                    {!event.isCustom && event.concorsoId && (
                      <div className="mt-2 flex justify-end">
                        <Link href={`/concorsi/${event.concorsoId}/fase2`}>
                          <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                            Vai al concorso
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
