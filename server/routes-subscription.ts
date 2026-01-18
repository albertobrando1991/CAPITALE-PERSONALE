
import type { Express } from 'express';
import { db } from './db';
import { userSubscriptions, userRoles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { isAlwaysPremium } from './utils/auth-helpers';

export function registerSubscriptionRoutes(app: Express) {
  console.log('💎 [INIT] Registrazione routes Subscription...');

  // GET - Status abbonamento utente corrente
  app.get('/api/subscription/status', async (req, res) => {
    try {
      const user = req.user as any;
      // Get email from multiple possible locations
      const userEmail = user?.email || user?.claims?.email;
      const userId = user?.id || user?.claims?.sub;

      console.log('[SUBSCRIPTION] Checking status for user:', { userId, userEmail, fullUser: JSON.stringify(user) });

      if (!userId) {
        console.log('[SUBSCRIPTION] No user ID, returning free tier');
        return res.json({ tier: 'free', status: 'none' });
      }

      // Check DB role
      const [userRole] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, userId));

      console.log('[SUBSCRIPTION] DB role for user:', userRole);

      const isDbAdmin = userRole?.role === 'admin' || userRole?.role === 'super_admin' || userRole?.role === 'staff';
      const isPremiumByEmail = isAlwaysPremium(userEmail);

      console.log('[SUBSCRIPTION] isDbAdmin:', isDbAdmin, 'isPremiumByEmail:', isPremiumByEmail, 'email used:', userEmail);

      // 🔥 ADMIN SEMPRE PREMIUM (Env var OR DB role)
      if (isPremiumByEmail || isDbAdmin) {
        console.log(`👑 Admin/Staff ${userEmail} → Force Premium`);
        return res.json({
          userId: userId,
          tier: 'premium',
          status: 'active',
          isAdmin: true,
          role: userRole?.role || 'admin',
          sintesiUsate: 0,
          sintesiLimite: null, // Illimitato
          startDate: new Date(),
          endDate: null,
        });
      }

      let [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));

      // Crea subscription free di default se non esiste
      if (!subscription) {
        [subscription] = await db.insert(userSubscriptions).values({
          userId: userId,
          tier: 'free',
          status: 'active',
          sintesiLimite: 5,
          sintesiUsate: 0,
        }).returning();
      }

      res.json(subscription);
    } catch (error) {
      console.error('❌ Errore status subscription:', error);
      res.status(500).json({ error: 'Errore recupero subscription' });
    }
  });

  // POST - Incrementa utilizzo sintesi
  app.post('/api/subscription/increment-usage', async (req, res) => {
    try {
      const user = req.user as any;
      const userEmail = user?.email || user?.claims?.email;
      const userId = user?.id || user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      // 🔥 ADMIN SINTESI ILLIMITATE
      if (isAlwaysPremium(userEmail)) {
        console.log(`👑 Admin ${userEmail} → Sintesi illimitate`);
        return res.json({ success: true, unlimited: true, isAdmin: true });
      }

      const [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription non trovata' });
      }

      // Se ha limite e lo ha superato
      if (subscription.sintesiLimite !== null && (subscription.sintesiUsate || 0) >= subscription.sintesiLimite) {
        return res.status(403).json({ error: 'Limite sintesi raggiunto per questo mese' });
      }

      // Incrementa
      await db.update(userSubscriptions)
        .set({ sintesiUsate: (subscription.sintesiUsate || 0) + 1 })
        .where(eq(userSubscriptions.userId, userId));

      res.json({ success: true, usage: (subscription.sintesiUsate || 0) + 1 });
    } catch (error) {
      console.error('❌ Errore increment usage:', error);
      res.status(500).json({ error: 'Errore aggiornamento usage' });
    }
  });

  console.log('✅ Routes Subscription registrate');
}
