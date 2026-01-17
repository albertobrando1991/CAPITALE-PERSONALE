import { db } from '../db';
import { sql } from 'drizzle-orm';
import { sendAdminNotification } from './notificationService';
import { securityAlerts } from '../../shared/schema';

interface SecurityRule {
  name: string;
  query: string;
  threshold: number;
  timeWindowMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    name: 'too_many_failed_logins',
    query: `
      SELECT user_email, COUNT(*) as count
      FROM audit_logs
      WHERE action_type = 'login_failed'
        AND created_at > NOW() - INTERVAL '15 minutes'
      GROUP BY user_email
      HAVING COUNT(*) >= $1
    `,
    threshold: 5,
    timeWindowMinutes: 15,
    severity: 'high',
    message: 'Troppi tentativi di login falliti per {user_email}: {count} in 15 minuti'
  },
  {
    name: 'mass_deletion',
    query: `
      SELECT user_email, entity_type, COUNT(*) as count
      FROM audit_logs
      WHERE action_type = 'delete'
        AND created_at > NOW() - INTERVAL '10 minutes'
      GROUP BY user_email, entity_type
      HAVING COUNT(*) >= $1
    `,
    threshold: 10,
    timeWindowMinutes: 10,
    severity: 'critical',
    message: 'Eliminazione massiva rilevata: {user_email} ha eliminato {count} {entity_type}'
  },
  {
    name: 'unusual_admin_activity',
    query: `
      SELECT user_email, COUNT(*) as count
      FROM audit_logs
      WHERE action_category = 'admin'
        AND created_at > NOW() - INTERVAL '1 hour'
        AND EXTRACT(HOUR FROM created_at) NOT BETWEEN 8 AND 20
      GROUP BY user_email
      HAVING COUNT(*) >= $1
    `,
    threshold: 5,
    timeWindowMinutes: 60,
    severity: 'medium',
    message: 'Attività admin fuori orario: {user_email} ha eseguito {count} azioni'
  },
  {
    name: 'multiple_ip_login',
    query: `
      SELECT user_email, COUNT(DISTINCT ip_address) as ip_count
      FROM audit_logs
      WHERE action_type = 'login_success'
        AND created_at > NOW() - INTERVAL '1 hour'
      GROUP BY user_email
      HAVING COUNT(DISTINCT ip_address) >= $1
    `,
    threshold: 3,
    timeWindowMinutes: 60,
    severity: 'medium',
    message: 'Login da IP multipli: {user_email} si è connesso da {ip_count} IP diversi'
  }
];

export class SecurityAlertService {
  async checkAllRules(): Promise<void> {
    for (const rule of SECURITY_RULES) {
      await this.checkRule(rule);
    }
  }

  private async checkRule(rule: SecurityRule): Promise<void> {
    try {
      // Execute the security check function via RPC equivalent (raw SQL)
      // The function execute_security_check takes query_text and threshold_value
      // const query = sql`SELECT execute_security_check(${rule.query}, ${rule.threshold}) as result`;
      
      // Execute query directly
      const query = sql.raw(rule.query.replace('$1', rule.threshold.toString()));
      const { rows: violations } = await db.execute(query);
      
      // const violations = rows[0]?.result as any[] || [];

      for (const violation of violations) {
        await this.handleViolation(rule, violation);
      }
    } catch (err) {
      console.error(`Errore controllo regola ${rule.name}:`, err);
    }
  }

  private async handleViolation(rule: SecurityRule, data: any): Promise<void> {
    // Formatta il messaggio
    let message = rule.message;
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(`{${key}}`, String(value));
    }

    // Salva l'alert
    await db.insert(securityAlerts).values({
      ruleName: rule.name,
      severity: rule.severity,
      message,
      data: data,
      resolved: false
    });

    // Notifica gli admin
    await sendAdminNotification({
      type: 'security_alert',
      severity: rule.severity,
      title: `Alert Sicurezza: ${rule.name}`,
      message
    });
  }
}

// Esegui controlli ogni 5 minuti
let monitoringInterval: NodeJS.Timeout | null = null;

export const startSecurityMonitoring = () => {
  if (monitoringInterval) return;
  
  const service = new SecurityAlertService();
  // Run immediately on start
  service.checkAllRules();
  
  monitoringInterval = setInterval(() => service.checkAllRules(), 5 * 60 * 1000);
  console.log('🛡️ Security monitoring started');
};
