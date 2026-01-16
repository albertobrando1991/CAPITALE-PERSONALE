import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, RefreshCw, Filter, Eye, CheckCircle, AlertCircle, AlertTriangle, Calendar as CalendarIcon
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLogDetailModal } from '@/components/admin/AuditLogDetailModal';
import { AdminLayout } from "@/components/admin/layout/AdminLayout";

// Costanti per filtri
const ACTION_CATEGORIES = [
  { value: 'all', label: 'Tutte le categorie' },
  { value: 'auth', label: 'Autenticazione' },
  { value: 'users', label: 'Utenti' },
  { value: 'content', label: 'Contenuti' },
  { value: 'subscriptions', label: 'Abbonamenti' },
  { value: 'admin', label: 'Amministrazione' },
  { value: 'ai', label: 'AI' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tutti gli stati' },
  { value: 'success', label: 'Successo' },
  { value: 'failure', label: 'Fallito' },
  { value: 'warning', label: 'Warning' }
];

export default function AuditLogPage() {
  // State per filtri
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    actionCategory: '',
    actionType: '',
    status: '',
    userId: '',
    search: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined
  });

  // State per UI
  const [selectedLog, setSelectedLog] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Hook personalizzato per fetch dati
  const { logs, pagination, stats, loading, error, refetch } = useAuditLogs({
      ...filters,
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      actionCategory: filters.actionCategory === 'all' ? '' : filters.actionCategory,
      status: filters.status === 'all' ? '' : filters.status
  });

  // Gestione filtri
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Export
  const handleExport = async (formatType: 'csv' | 'json') => {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`/api/admin/audit-logs/export?format=${formatType}&${params.toString()}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${formatType === 'csv' ? 'export.csv' : 'export.json'}`;
    a.click();
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>;
      case 'failure':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground">Monitora tutte le attività del sistema e degli utenti</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filtri
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Attività ultimi 30 giorni</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.byDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(d) => format(new Date(d), 'dd/MM', { locale: it })} />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="total_count" stroke="#8884d8" name="Azioni" strokeWidth={2} />
                  <Line type="monotone" dataKey="unique_users" stroke="#82ca9d" name="Utenti unici" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byCategory?.slice(0, 6).map((cat: any) => (
                  <div key={cat.category} className="flex justify-between items-center">
                    <span className="capitalize">{cat.category}</span>
                    <Badge variant="secondary">{cat.total_count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtri */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cerca</label>
                  <Input 
                    placeholder="Email, descrizione..." 
                    value={filters.search} 
                    onChange={(e) => handleFilterChange('search', e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
                  <Select 
                    value={filters.actionCategory || 'all'} 
                    onValueChange={(val) => handleFilterChange('actionCategory', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stato</label>
                  <Select 
                    value={filters.status || 'all'} 
                    onValueChange={(val) => handleFilterChange('status', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium">Data Inizio</label>
                   <Input 
                     type="date" 
                     value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                     onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                   />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabella Log */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Ora</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead>Entità</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      Caricamento in corso...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      Nessun log trovato.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: it })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.user_email || 'Sistema'}</span>
                          <span className="text-xs text-muted-foreground">{log.user_role}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{log.action_category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.action_type}>
                        {log.action_type}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {log.entity_type && (
                          <span className="text-xs" title={`${log.entity_type}: ${log.entity_name || log.entity_id}`}>
                            {log.entity_type}: {log.entity_name || '...'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{renderStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ip_address}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Paginazione semplice */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} risultati)
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={pagination.page <= 1}
              onClick={() => handleFilterChange('page', pagination.page - 1)}
            >
              Precedente
            </Button>
            <Button 
              variant="outline" 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handleFilterChange('page', pagination.page + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      </div>

      <AuditLogDetailModal 
        open={!!selectedLog} 
        log={selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
    </AdminLayout>
  );
}
