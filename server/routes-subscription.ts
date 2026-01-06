
import type { Express } from 'express';
import { db } from './db';
import { userSubscriptions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { isAlwaysPremium } from './utils/auth-helpers';

export function registerSubscriptionRoutes(app: Express) {
  console.log('💎 [INIT] Registrazione routes Subscription...');

  // GET - Status abbonamento utente corrente
  app.get('/api/subscription/status', async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.json({ tier: 'free', status: 'none' });
      }

      // 🔥 ADMIN SEMPRE PREMIUM
      if (isAlwaysPremium(req.user.email)) {
        console.log(`👑 Admin ${req.user.email} → Force Premium`);
        return res.json({
          userId: req.user.id,
          tier: 'premium',
          status: 'active',
          isAdmin: true,
          sintesiUsate: 0,
          sintesiLimite: null, // Illimitato
          startDate: new Date(),
          endDate: null,
        });
      }

      let [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, req.user.id));

      // Crea subscription free di default se non esiste
      if (!subscription) {
        [subscription] = await db.insert(userSubscriptions).values({
          userId: req.user.id,
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
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      // 🔥 ADMIN SINTESI ILLIMITATE
      if (isAlwaysPremium(req.user.email)) {
        console.log(`👑 Admin ${req.user.email} → Sintesi illimitate`);
        return res.json({ success: true, unlimited: true, isAdmin: true });
      }

      const [subscription] = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, req.user.id));

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
        .where(eq(userSubscriptions.userId, req.user.id));

      res.json({ success: true, usage: (subscription.sintesiUsate || 0) + 1 });
    } catch (error) {
      console.error('❌ Errore increment usage:', error);
      res.status(500).json({ error: 'Errore aggiornamento usage' });
    }
  });

  console.log('✅ Routes Subscription registrate');
}
