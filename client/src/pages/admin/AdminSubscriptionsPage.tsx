
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Search,
  Loader2,
  Crown,
  Users,
  AlertCircle,
  CalendarPlus,
  Edit,
  RefreshCw,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due';
  startDate: string | null;
  endDate: string | null;
  currentPeriodEnd: string | null;
  sintesiUsate: number | null;
  sintesiLimite: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  userCreatedAt: string | null;
}

interface SubscriptionStats {
  total: number;
  byTier: { free: number; premium: number; enterprise: number };
  byStatus: { active: number; canceled: number };
  expiringSoon: number;
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editTier, setEditTier] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [editSintesiLimite, setEditSintesiLimite] = useState<string>("");

  // Extend Modal State
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [extendReason, setExtendReason] = useState("");

  // Fetch Stats
  const { data: stats, isLoading: statsLoading } = useQuery<SubscriptionStats>({
    queryKey: ['admin-subscriptions-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/subscriptions/stats');
      if (!res.ok) throw new Error('Errore caricamento statistiche');
      return res.json();
    }
  });

  // Fetch Subscriptions
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page, searchTerm, tierFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        search: searchTerm,
        tier: tierFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (!res.ok) throw new Error('Errore caricamento abbonamenti');
      return res.json();
    }
  });

  // Update Subscription Mutation
  const updateMutation = useMutation({
    mutationFn: async (params: { userId: string; data: any }) => {
      const res = await fetch(`/api/admin/subscriptions/${params.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore aggiornamento');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Abbonamento aggiornato", description: "Le modifiche sono state salvate." });
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-stats'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Extend Subscription Mutation
  const extendMutation = useMutation({
    mutationFn: async (params: { userId: string; days: number; reason?: string }) => {
      const res = await fetch(`/api/admin/subscriptions/${params.userId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: params.days, reason: params.reason })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore estensione');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Abbonamento esteso", description: data.message });
      setExtendModalOpen(false);
      setExtendDays("30");
      setExtendReason("");
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-stats'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  // Reset Usage Mutation
  const resetUsageMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/subscriptions/${userId}/reset-usage`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore reset');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Contatori azzerati", description: "I contatori di utilizzo sono stati resettati." });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (err: Error) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    }
  });

  const openEditModal = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setEditTier(sub.tier);
    setEditStatus(sub.status);
    setEditEndDate(sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '');
    setEditSintesiLimite(String(sub.sintesiLimite || 0));
    setEditModalOpen(true);
  };

  const openExtendModal = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setExtendModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSubscription) return;
    updateMutation.mutate({
      userId: selectedSubscription.userId,
      data: {
        tier: editTier,
        status: editStatus,
        endDate: editEndDate || undefined,
        sintesiLimite: parseInt(editSintesiLimite) || undefined,
      }
    });
  };

  const handleExtend = () => {
    if (!selectedSubscription) return;
    extendMutation.mutate({
      userId: selectedSubscription.userId,
      days: parseInt(extendDays),
      reason: extendReason || undefined,
    });
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <Badge className="bg-purple-600">Enterprise</Badge>;
      case 'premium':
        return <Badge className="bg-amber-500">Premium</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Attivo</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancellato</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isExpiringSoon = (endDate: string | null) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestione Abbonamenti</h2>
          <p className="text-muted-foreground">Monitora e gestisci gli abbonamenti degli utenti.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Abbonamenti</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium</CardTitle>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {statsLoading ? '...' : stats?.byTier.premium || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                + {statsLoading ? '...' : stats?.byTier.enterprise || 0} Enterprise
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attivi</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : stats?.byStatus.active || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Scadenza</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : stats?.expiringSoon || 0}
              </div>
              <p className="text-xs text-muted-foreground">Entro 7 giorni</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista Abbonamenti
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca utente..."
                    className="w-[180px] h-8"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Tier</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli Stati</SelectItem>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="canceled">Cancellato</SelectItem>
                    <SelectItem value="past_due">Scaduto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead>Utilizzo</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.subscriptions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun abbonamento trovato
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.subscriptions?.map((sub: Subscription) => (
                        <TableRow key={sub.id} className={isExpiringSoon(sub.endDate) ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sub.userName || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getTierBadge(sub.tier)}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isExpiringSoon(sub.endDate) && (
                                <Clock className="h-4 w-4 text-orange-500" />
                              )}
                              {formatDate(sub.endDate || sub.currentPeriodEnd)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {sub.sintesiUsate || 0} / {sub.sintesiLimite || '∞'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(sub)}
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openExtendModal(sub)}
                                title="Estendi"
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Sei sicuro di voler azzerare i contatori di utilizzo?')) {
                                    resetUsageMutation.mutate(sub.userId);
                                  }
                                }}
                                title="Reset Contatori"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {data.pagination.page} di {data.pagination.totalPages} ({data.pagination.total} totali)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= data.pagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Subscription Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Abbonamento</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.userName} ({selectedSubscription?.userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={editTier} onValueChange={setEditTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stato</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="canceled">Cancellato</SelectItem>
                    <SelectItem value="past_due">Scaduto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Scadenza</Label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Sintesi</Label>
                <Input
                  type="number"
                  value={editSintesiLimite}
                  onChange={(e) => setEditSintesiLimite(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Modal */}
      <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Estendi Abbonamento</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.userName} ({selectedSubscription?.userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Giorni da aggiungere</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 giorni</SelectItem>
                  <SelectItem value="14">14 giorni</SelectItem>
                  <SelectItem value="30">30 giorni (1 mese)</SelectItem>
                  <SelectItem value="60">60 giorni (2 mesi)</SelectItem>
                  <SelectItem value="90">90 giorni (3 mesi)</SelectItem>
                  <SelectItem value="180">180 giorni (6 mesi)</SelectItem>
                  <SelectItem value="365">365 giorni (1 anno)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opzionale)</Label>
              <Input
                placeholder="es. Promozione, Compensazione, ecc."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
            {selectedSubscription?.endDate && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p>Scadenza attuale: <strong>{formatDate(selectedSubscription.endDate)}</strong></p>
                <p>Nuova scadenza: <strong>
                  {formatDate(new Date(new Date(selectedSubscription.endDate > new Date().toISOString() ? selectedSubscription.endDate : new Date()).getTime() + parseInt(extendDays) * 24 * 60 * 60 * 1000).toISOString())}
                </strong></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendModalOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="mr-2 h-4 w-4" />
              )}
              Estendi Abbonamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
