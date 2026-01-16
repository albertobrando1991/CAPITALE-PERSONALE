
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Analisi dettagliate dell'utilizzo della piattaforma.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Metriche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-8 text-center">
              Grafici analytics in arrivo...
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
