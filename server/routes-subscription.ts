
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
      const userEmail = user?.email || user?.claims?.email;
      const userId = user?.id || user?.claims?.sub; // Ensure we get the ID correctly

      console.log('[SUBSCRIPTION] Checking status for user:', { userId, userEmail });

      if (!userId) {
        return res.json({ tier: 'free', status: 'none', isAdmin: false });
      }

      // 1. Check Role in DB (Source of Truth for Admin)
      const [roleData] = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, userId))
        .limit(1);

      const isDbAdmin = roleData?.role === 'admin' || roleData?.role === 'super_admin' || roleData?.role === 'staff';

      // 2. Check Subscription in DB
      let [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));

      // 3. Construct response
      const tier = subscription?.tier || (isDbAdmin ? 'enterprise' : 'free');
      const status = subscription?.status || (isDbAdmin ? 'active' : 'active');
      const isPremium = tier === 'premium' || tier === 'enterprise' || isDbAdmin;

      const response = {
        userId,
        tier,
        status,
        isAdmin: isDbAdmin,
        role: roleData?.role || 'user',
        isPremium,
        // Admin gets unlimited synthesis
        sintesiUsate: subscription?.sintesiUsate || 0,
        sintesiLimite: isDbAdmin ? null : (subscription?.sintesiLimite || 5),
        startDate: subscription?.startDate || new Date(),
        endDate: subscription?.endDate,
      };

      console.log(`[SUBSCRIPTION] Returning status for ${userEmail}:`, { tier, isAdmin: isDbAdmin });
      res.json(response);

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
