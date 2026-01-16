import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface AuditLogFilters {
  page: number;
  limit: number;
  userId?: string;
  actionType?: string;
  actionCategory?: string;
  status?: string;
  search?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export function useAuditLogs(initialFilters: AuditLogFilters) {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ byCategory: [], byDay: [], failures: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });
  
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', initialFilters.page.toString());
      params.append('limit', initialFilters.limit.toString());
      if (initialFilters.userId) params.append('userId', initialFilters.userId);
      if (initialFilters.actionCategory) params.append('actionCategory', initialFilters.actionCategory);
      if (initialFilters.actionType) params.append('actionType', initialFilters.actionType);
      if (initialFilters.status) params.append('status', initialFilters.status);
      if (initialFilters.search) params.append('search', initialFilters.search);
      if (initialFilters.startDate) params.append('startDate', initialFilters.startDate.toISOString());
      if (initialFilters.endDate) params.append('endDate', initialFilters.endDate.toISOString());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('Errore nel caricamento dei log');
      
      const data = await res.json();
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [initialFilters, toast]);

  const fetchStats = useCallback(async () => {
    try {
       const params = new URLSearchParams();
       if (initialFilters.startDate) params.append('startDate', initialFilters.startDate.toISOString());
       if (initialFilters.endDate) params.append('endDate', initialFilters.endDate.toISOString());

       const res = await fetch(`/api/admin/audit-logs/stats/summary?${params.toString()}`);
       if (res.ok) {
         const data = await res.json();
         setStats(data.data);
       }
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  }, [initialFilters.startDate, initialFilters.endDate]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  return { logs, pagination, stats, loading, error, refetch: () => { fetchLogs(); fetchStats(); } };
}
