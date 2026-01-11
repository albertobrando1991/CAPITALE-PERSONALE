import { useEffect, useState } from 'react';
import { useBenessere } from '@/contexts/BenessereContext';

export default function HydrationReminder() {
  const { stats } = useBenessere();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, []);

  useEffect(() => {
    if (!stats || permission !== 'granted') return;

    // Check ogni ora se l'utente non ha bevuto
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();

      // Solo durante orari di studio (8-22)
      if (currentHour >= 8 && currentHour <= 22) {
        // Check se percentuale idratazione è bassa
        if (stats.hydration.percentage < 50) {
          new Notification('💧 Ricordati di Bere!', {
            body: `Hai bevuto solo ${stats.hydration.glasses_today} bicchieri oggi. L'idratazione migliora le performance cognitive del 20%!`,
            tag: 'hydration-reminder'
          });
        }
      }
    }, 60 * 60 * 1000); // Ogni ora

    return () => clearInterval(interval);
  }, [stats, permission]);

  return null; // Componente invisibile
}
