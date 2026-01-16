
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function AdminSubscriptionsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Abbonamenti</h2>
          <p className="text-muted-foreground">Monitora gli abbonamenti e i pagamenti.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stato Abbonamenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-8 text-center">
              Dashboard abbonamenti in arrivo...
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
