import { Router } from 'express';
import { db } from './db';
import { podcastDatabase, podcastRequests, staffMembers } from '../shared/schema-sq3r';
import { users, userSubscriptions, userRoles, userSuspensions, adminActivityLog } from '../shared/schema';
import { eq, desc, sql, like, or, and } from 'drizzle-orm';
import { isAdmin, isStaff } from './utils/auth-helpers';
import { getUserId } from './middleware/auth';
import multer from 'multer';
import { z } from 'zod';

const router = Router();

// Middleware per verificare admin
async function requireAdmin(req: any, res: any, next: any) {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const userEmail = user.email || 'dev@trae-ai.com';

  // 1. Check Env Vars first (sync)
  if (isAdmin(userEmail)) {
    console.log(`✅ Accesso ADMIN (Env) consentito per ${userEmail}`);
    return next();
  }

  // 2. Check Database (async)
  try {
    const [userRole] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id || user.sub))
      .limit(1);

    if (userRole?.role === 'admin' || userRole?.role === 'super_admin') {
      console.log(`✅ Accesso ADMIN (DB) consentito per ${userEmail}`);
      return next();
    }
  } catch (err) {
    console.error("❌ Errore check admin role:", err);
  }

  console.log(`🚫 Accesso negato per ${userEmail} (richiede ADMIN)`);
  return res.status(403).json({
    error: 'Accesso negato',
    message: 'Solo gli amministratori possono accedere a questa risorsa'
  });
}

// Middleware per verificare staff
async function requireStaff(req: any, res: any, next: any) {
  const user = req.user as any;
  if (!user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const userEmail = user.email || 'dev@trae-ai.com';

  // 1. Check Env Vars first
  if (isStaff(userEmail) || isAdmin(userEmail)) {
    console.log(`✅ Accesso STAFF (Env) consentito per ${userEmail}`);
    return next();
  }

  // 2. Check Database
  try {
    const [userRole] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, user.id || user.sub))
      .limit(1);

    const role = userRole?.role;
    if (role === 'staff' || role === 'admin' || role === 'super_admin') {
      console.log(`✅ Accesso STAFF (DB) consentito per ${userEmail}`);
      return next();
    }
  } catch (err) {
    console.error("❌ Errore check staff role:", err);
  }

  console.log(`🚫 Accesso negato per ${userEmail} (richiede STAFF o ADMIN)`);
  return res.status(403).json({
    error: 'Accesso negato',
    message: 'Solo lo staff può accedere a questa risorsa'
  });
}

// Multer per upload audio (max 100MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Totali
    const [
      totalPodcasts,
      totalRequests,
      pendingRequests,
      totalUsers,
      premiumUsers,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(podcastDatabase),
      db.select({ count: sql<number>`count(*)` }).from(podcastRequests),
      db.select({ count: sql<number>`count(*)` }).from(podcastRequests).where(eq(podcastRequests.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(userSubscriptions),
      db.select({ count: sql<number>`count(*)` }).from(userSubscriptions).where(sql`tier IN ('premium', 'enterprise')`),
    ]);

    res.json({
      podcasts: {
        total: Number(totalPodcasts[0]?.count || 0),
      },
      requests: {
        total: Number(totalRequests[0]?.count || 0),
        pending: Number(pendingRequests[0]?.count || 0),
      },
      users: {
        total: Number(totalUsers[0]?.count || 0),
        premium: Number(premiumUsers[0]?.count || 0),
        free: Number(totalUsers[0]?.count || 0) - Number(premiumUsers[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('❌ Errore recupero stats:', error);
    res.status(500).json({ error: 'Errore recupero statistiche' });
  }
});

// ============================================
// PODCAST MANAGEMENT
// ============================================

// Lista tutti i podcast (staff)
router.get('/podcast', requireStaff, async (req, res) => {
  try {
    const podcasts = await db
      .select()
      .from(podcastDatabase)
      .orderBy(desc(podcastDatabase.createdAt));

    res.json(podcasts);
  } catch (error: any) {
    console.error('❌ Errore recupero podcast admin:', error);
    res.status(500).json({ error: 'Errore recupero podcast' });
  }
});

// Upload nuovo podcast
router.post('/podcast/upload', requireStaff, upload.single('audio'), async (req, res) => {
  try {
    const user = req.user as any;
    const audioFile = req.file;
    const {
      titolo,
      descrizione,
      materia,
      argomento,
      durata,
      trascrizione,
      isPremiumOnly,
      requestId  // NUOVO: ID della richiesta (opzionale)
    } = req.body;

    if (!audioFile) {
      return res.status(400).json({ error: 'File audio mancante' });
    }

    if (!titolo || !materia) {
      return res.status(400).json({ error: 'Titolo e materia sono obbligatori' });
    }

    // Converti audio in base64 (oppure salva su storage cloud)
    const audioBase64 = audioFile.buffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Crea podcast
    const [podcast] = await db.insert(podcastDatabase).values({
      titolo,
      descrizione: descrizione || '',
      materia,
      argomento: argomento || '',
      audioUrl,
      audioFileName: audioFile.originalname,
      audioFileSize: audioFile.size,
      durata: parseInt(durata) || 0,
      trascrizione: trascrizione || '',
      uploadedBy: user!.id,
      isPublic: true,
      isPremiumOnly: isPremiumOnly === 'true' || isPremiumOnly === true,
    }).returning();

    console.log(`✅ Podcast caricato dall'admin: ${podcast.titolo}`);

    // NUOVO: Se c'è una richiesta collegata, aggiornala automaticamente
    if (requestId) {
      try {
        const [updatedRequest] = await db
          .update(podcastRequests)
          .set({
            status: 'completed',
            podcastId: podcast.id,
            noteStaff: `Podcast caricato: ${podcast.titolo}`,
            completedAt: new Date(),
          })
          .where(eq(podcastRequests.id, requestId))
          .returning();

        if (updatedRequest) {
          console.log(`✅ Richiesta ${requestId} collegata al podcast ${podcast.id}`);
        }
      } catch (requestError) {
        console.error('❌ Errore collegamento richiesta:', requestError);
        // Non bloccare l'upload se il collegamento fallisce
      }
    }

    res.json(podcast);
  } catch (error: any) {
    console.error('❌ Errore upload podcast:', error);
    res.status(500).json({ error: 'Errore upload podcast' });
  }
});

// Elimina podcast
router.delete('/podcast/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(podcastDatabase)
      .where(eq(podcastDatabase.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Podcast non trovato' });
    }

    console.log(`✅ Podcast eliminato: ${deleted[0].titolo}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore eliminazione podcast:', error);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

// ============================================
// RICHIESTE PODCAST UTENTI
// ============================================

// Lista tutte le richieste
router.get('/requests', requireStaff, async (req, res) => {
  try {
    const { status } = req.query;

    let query = db.select().from(podcastRequests);

    if (status && status !== 'all') {
      query = query.where(eq(podcastRequests.status, status as string)) as any;
    }

    const requests = await query.orderBy(desc(podcastRequests.createdAt));

    res.json(requests);
  } catch (error: any) {
    console.error('❌ Errore recupero richieste:', error);
    res.status(500).json({ error: 'Errore recupero richieste' });
  }
});

// Aggiorna stato richiesta
router.patch('/requests/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, noteStaff, priorita, podcastId } = req.body;

    const [updated] = await db
      .update(podcastRequests)
      .set({
        status,
        noteStaff: noteStaff || undefined,
        priorita: priorita || undefined,
        podcastId: podcastId || undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(podcastRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    console.log(`✅ Richiesta aggiornata: ${updated.id} → ${status}`);
    res.json(updated);
  } catch (error: any) {
    console.error('❌ Errore aggiornamento richiesta:', error);
    res.status(500).json({ error: 'Errore aggiornamento' });
  }
});

// Elimina richiesta
router.delete('/requests/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Gestione Bulk Delete (se id è 'bulk')
    if (id === 'bulk') {
      const { status } = req.body; // Es: { status: 'completed' }

      if (!status) {
        return res.status(400).json({ error: 'Stato mancante per eliminazione bulk' });
      }

      const deleted = await db
        .delete(podcastRequests)
        .where(eq(podcastRequests.status, status))
        .returning();

      console.log(`✅ Bulk Delete: eliminate ${deleted.length} richieste con stato ${status}`);
      return res.json({ success: true, count: deleted.length });
    }

    // Eliminazione Singola
    const deleted = await db
      .delete(podcastRequests)
      .where(eq(podcastRequests.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    console.log(`✅ Richiesta eliminata: ${deleted[0].id} (${deleted[0].argomento})`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore eliminazione richiesta:', error);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

// ============================================
// STAFF MANAGEMENT
// ============================================

// Lista staff members
router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const staff = await db
      .select()
      .from(staffMembers)
      .orderBy(desc(staffMembers.createdAt));

    res.json(staff);
  } catch (error: any) {
    console.error('❌ Errore recupero staff:', error);
    res.status(500).json({ error: 'Errore recupero staff' });
  }
});

// Aggiungi staff member
router.post('/staff', requireAdmin, async (req, res) => {
  try {
    const { email, nome, ruolo, permessi } = req.body;

    if (!email || !nome) {
      return res.status(400).json({ error: 'Email e nome sono obbligatori' });
    }

    // Verifica se esiste già
    const existing = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email già registrata nello staff' });
    }

    // Crea staff member
    const [staff] = await db.insert(staffMembers).values({
      userId: `staff-${Date.now()}`, // Generato temporaneo
      email,
      nome,
      ruolo: ruolo || 'staff',
      permessi: permessi || {
        canUploadPodcast: false,
        canManageRequests: false,
        canManageUsers: false,
        canManageStaff: false,
      },
      isActive: true,
    }).returning();

    console.log(`✅ Staff member aggiunto: ${staff.email}`);
    res.json(staff);
  } catch (error: any) {
    console.error('❌ Errore aggiunta staff:', error);
    res.status(500).json({ error: 'Errore aggiunta staff' });
  }
});

// Rimuovi staff member
router.delete('/staff/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(staffMembers)
      .where(eq(staffMembers.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Staff member non trovato' });
    }

    console.log(`✅ Staff member rimosso: ${deleted[0].email}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore rimozione staff:', error);
    res.status(500).json({ error: 'Errore rimozione' });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Lista utenti paginata con ricerca
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build query with optional search
    let baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      })
      .from(users);

    if (search) {
      const searchTerm = `%${search}%`;
      baseQuery = baseQuery.where(
        or(
          like(users.email, searchTerm),
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm)
        )
      ) as any;
    }

    const usersData = await baseQuery
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get roles and subscriptions for each user
    const enrichedUsers = await Promise.all(
      usersData.map(async (u) => {
        const [roleData] = await db
          .select({ role: userRoles.role })
          .from(userRoles)
          .where(eq(userRoles.userId, u.id))
          .limit(1);

        const [subData] = await db
          .select({ tier: userSubscriptions.tier, status: userSubscriptions.status })
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, u.id))
          .limit(1);

        const [suspensionData] = await db
          .select()
          .from(userSuspensions)
          .where(and(
            eq(userSuspensions.userId, u.id),
            eq(userSuspensions.isActive, true)
          ))
          .limit(1);

        return {
          ...u,
          role: roleData?.role || 'user',
          subscriptionTier: subData?.tier || 'free',
          subscriptionStatus: subData?.status || 'none',
          isSuspended: !!suspensionData,
          suspensionReason: suspensionData?.reason,
        };
      })
    );

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const totalCount = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      data: enrichedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ Errore lista utenti:', error);
    res.status(500).json({ error: 'Errore recupero utenti' });
  }
});

// Validazione per invito
const inviteSchema = z.object({
  email: z.string().email('Email non valida'),
  role: z.enum(['staff', 'admin']).default('staff'),
});

// Invita staff/admin
router.post('/invite', requireAdmin, async (req, res) => {
  try {
    const adminId = getUserId(req);
    const parsed = inviteSchema.parse(req.body);

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already has role
      const [existingRole] = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, userId))
        .limit(1);

      if (existingRole) {
        return res.status(409).json({
          error: 'Utente ha già un ruolo assegnato',
          currentRole: existingRole.role
        });
      }
    } else {
      // Create user placeholder
      const [newUser] = await db
        .insert(users)
        .values({
          email: parsed.email,
        })
        .returning();
      userId = newUser.id;
    }

    // Assign role
    await db.insert(userRoles).values({
      userId,
      role: parsed.role,
      assignedBy: adminId,
    });

    // Log activity
    await db.insert(adminActivityLog).values({
      adminId: adminId!,
      action: 'invite_user',
      entityType: 'user',
      entityId: userId,
      details: { email: parsed.email, role: parsed.role },
    });

    console.log(`✅ Utente invitato: ${parsed.email} come ${parsed.role}`);

    // TODO: Send invitation email
    // await sendInvitationEmail(parsed.email, parsed.role);

    res.json({
      success: true,
      message: `Invito inviato a ${parsed.email}`,
      userId,
    });
  } catch (error: any) {
    console.error('❌ Errore invito:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Errore invio invito' });
  }
});

// Validazione cambio ruolo
const changeRoleSchema = z.object({
  role: z.enum(['user', 'staff', 'admin', 'super_admin']),
});

// Cambia ruolo utente
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const adminId = getUserId(req);
    const { id: targetUserId } = req.params;
    const parsed = changeRoleSchema.parse(req.body);

    // Prevent self-demotion
    if (targetUserId === adminId && parsed.role === 'user') {
      return res.status(400).json({ error: 'Non puoi rimuovere il tuo stesso ruolo admin' });
    }

    // Super admin can only be assigned by super admin
    if (parsed.role === 'super_admin') {
      const [adminRole] = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, adminId!))
        .limit(1);

      if (adminRole?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Solo super_admin può assegnare ruolo super_admin' });
      }
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Upsert role
    const [existingRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, targetUserId))
      .limit(1);

    if (existingRole) {
      await db
        .update(userRoles)
        .set({ role: parsed.role, assignedBy: adminId, assignedAt: new Date() })
        .where(eq(userRoles.userId, targetUserId));
    } else {
      await db.insert(userRoles).values({
        userId: targetUserId,
        role: parsed.role,
        assignedBy: adminId,
      });
    }

    // Log activity
    await db.insert(adminActivityLog).values({
      adminId: adminId!,
      action: 'change_role',
      entityType: 'user',
      entityId: targetUserId,
      details: {
        previousRole: existingRole?.role || 'user',
        newRole: parsed.role
      },
    });

    console.log(`✅ Ruolo cambiato: ${user.email} → ${parsed.role}`);

    res.json({
      success: true,
      userId: targetUserId,
      role: parsed.role,
    });
  } catch (error: any) {
    console.error('❌ Errore cambio ruolo:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Errore cambio ruolo' });
  }
});

// Validazione ban
const banSchema = z.object({
  reason: z.string().min(5, 'Motivo troppo breve'),
  expiresAt: z.string().datetime().optional(),
});

// Ban/Sospendi utente
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const adminId = getUserId(req);
    const { id: targetUserId } = req.params;
    const parsed = banSchema.parse(req.body);

    // Prevent self-ban
    if (targetUserId === adminId) {
      return res.status(400).json({ error: 'Non puoi sospendere te stesso' });
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Check target's role - can't ban admins unless you're super_admin
    const [targetRole] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, targetUserId))
      .limit(1);

    if (targetRole?.role === 'admin' || targetRole?.role === 'super_admin') {
      const [adminRole] = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, adminId!))
        .limit(1);

      if (adminRole?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Solo super_admin può sospendere altri admin' });
      }
    }

    // Deactivate any existing suspension
    await db
      .update(userSuspensions)
      .set({ isActive: false })
      .where(eq(userSuspensions.userId, targetUserId));

    // Create new suspension
    const [suspension] = await db.insert(userSuspensions).values({
      userId: targetUserId,
      reason: parsed.reason,
      suspendedBy: adminId!,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      isActive: true,
    }).returning();

    // Log activity
    await db.insert(adminActivityLog).values({
      adminId: adminId!,
      action: 'ban_user',
      entityType: 'user',
      entityId: targetUserId,
      details: { reason: parsed.reason, expiresAt: parsed.expiresAt },
    });

    console.log(`✅ Utente sospeso: ${user.email} - ${parsed.reason}`);

    res.json({
      success: true,
      suspension,
    });
  } catch (error: any) {
    console.error('❌ Errore sospensione:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Errore sospensione utente' });
  }
});

// Rimuovi ban
router.delete('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const adminId = getUserId(req);
    const { id: targetUserId } = req.params;

    const [updated] = await db
      .update(userSuspensions)
      .set({ isActive: false })
      .where(and(
        eq(userSuspensions.userId, targetUserId),
        eq(userSuspensions.isActive, true)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Nessuna sospensione attiva trovata' });
    }

    // Log activity
    await db.insert(adminActivityLog).values({
      adminId: adminId!,
      action: 'unban_user',
      entityType: 'user',
      entityId: targetUserId,
      details: {},
    });

    console.log(`✅ Sospensione rimossa per utente: ${targetUserId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Errore rimozione sospensione:', error);
    res.status(500).json({ error: 'Errore rimozione sospensione' });
  }
});

// Dettaglio utente
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const [roleData] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, id))
      .limit(1);

    const [subData] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, id))
      .limit(1);

    const [suspensionData] = await db
      .select()
      .from(userSuspensions)
      .where(and(
        eq(userSuspensions.userId, id),
        eq(userSuspensions.isActive, true)
      ))
      .limit(1);

    res.json({
      ...user,
      role: roleData?.role || 'user',
      roleAssignedAt: roleData?.assignedAt,
      subscription: subData || null,
      suspension: suspensionData || null,
    });
  } catch (error: any) {
    console.error('❌ Errore dettaglio utente:', error);
    res.status(500).json({ error: 'Errore recupero utente' });
  }
});

export function registerAdminRoutes(app: any) {
  app.use('/api/admin', router);
  console.log('✅ Admin Routes registrate');
}
