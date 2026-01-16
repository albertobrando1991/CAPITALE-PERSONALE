
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { StatsCard } from "@/components/admin/common/StatsCard";
import { LineChart } from "@/components/admin/charts/LineChart";
import { BarChart } from "@/components/admin/charts/BarChart";
import { PieChart } from "@/components/admin/charts/PieChart";
import { Users, UserPlus, CreditCard, DollarSign, Activity, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminOverviewPage() {
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['admin-stats-overview'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats/overview');
      if (!res.ok) throw new Error('Errore nel caricamento delle statistiche');
      return res.json();
    }
  });

  // KPI Stats
  const stats = [
    { 
      title: "Utenti Totali", 
      value: apiData?.usersTotal?.toString() || "0", 
      icon: Users, 
      trend: { value: 0, label: "vs mese scorso", positive: true } 
    },
    { 
      title: "Nuove Iscrizioni Oggi", 
      value: apiData?.newUsersToday?.toString() || "0", 
      icon: UserPlus, 
      trend: { value: 0, label: "vs ieri", positive: true } 
    },
    { 
      title: "Abbonamenti Attivi", 
      value: apiData?.subscriptionsActive?.toString() || "0", 
      icon: CreditCard, 
      trend: { value: 0, label: "vs mese scorso", positive: true } 
    },
    { 
      title: "Ricavi Mensili (Sim)", 
      value: `€${apiData?.revenueMonthly || 0}`, 
      icon: DollarSign, 
      trend: { value: 0, label: "vs mese scorso", positive: true } 
    },
  ];

  // Charts Data (with fallback if empty)
  const registrationsData = apiData?.charts?.registrations?.length > 0 
    ? apiData.charts.registrations 
    : [{ name: "Oggi", value: 0 }];

  const subscriptionDistribution = apiData?.charts?.subscriptions?.length > 0
    ? apiData.charts.subscriptions
    : [{ name: "Nessun Dato", value: 1, color: "#e2e8f0" }];

  const popularConcorsi = apiData?.charts?.popularConcorsi?.length > 0
    ? apiData.charts.popularConcorsi.map((c: any) => ({ ...c, color: "#3b82f6" }))
    : [{ name: "Nessun Dato", value: 0, color: "#e2e8f0" }];

  const revenueData = [
    { name: "Lug", value: 8500 }, { name: "Ago", value: 9200 }, { name: "Set", value: 10500 },
    { name: "Ott", value: 11000 }, { name: "Nov", value: 11800 }, { name: "Dic", value: 12450 },
  ]; // Still mock until payments table is ready

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">Benvenuto nella dashboard amministrativa.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatsCard key={i} {...stat} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <LineChart 
              title="Andamento Iscrizioni (Ultimi 30 giorni)" 
              data={registrationsData}
              lines={[{ key: "value", color: "#3b82f6", name: "Iscrizioni" }]}
            />
          </div>
          <div className="col-span-3">
            <PieChart 
              title="Distribuzione Abbonamenti" 
              data={subscriptionDistribution} 
            />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          <BarChart 
            title="Concorsi Più Popolari" 
            data={popularConcorsi}
            bars={[{ key: "value", color: "#3b82f6", name: "Utenti Iscritti" }]}
          />
          <LineChart 
            title="Andamento Ricavi (Ultimi 6 mesi)" 
            data={revenueData}
            lines={[{ key: "value", color: "#10b981", name: "Ricavi (€)" }]}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
