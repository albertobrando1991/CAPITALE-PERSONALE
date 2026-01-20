
import nodemailer from "nodemailer";

// Configuration from Env Vars
const SMTP_HOST = process.env.SMTP_HOST || "mta2.priv.ovhmail-u1.ea.mail.ovh.net";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "info@capitalepersonale.it";
const SMTP_PASS = process.env.SMTP_PASS; // Must be in .env
const MAIL_FROM = process.env.MAIL_FROM || "noreply@capitalepersonale.it";

// Create Reusable Transporter
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false, // Relax security for some shared hosts if needed
    },
});

/**
 * Send a generic email
 */
export async function sendEmail(to: string, subject: string, html: string) {
    if (!SMTP_PASS) {
        console.warn("⚠️ SMTP_PASS not set. Email skipping:", subject);
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'C.P.A. 2.0'}" <${MAIL_FROM}>`,
            to,
            subject,
            html,
        });
        console.log("✅ Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Email failed:", error);
        return false;
    }
}

/**
 * Send invitation email to new staff/admin
 */
export async function sendInvitationEmail(email: string, role: string, inviterName: string = "Admin") {
    const loginUrl = `${process.env.VITE_APP_URL || 'https://capitale-personale-1.vercel.app'}/login`;

    const subject = `Sei stato invitato come ${role.toUpperCase()} su C.P.A. 2.0`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f172a;">Benvenuto nel Team!</h2>
      <p>Ciao,</p>
      <p><strong>${inviterName}</strong> ti ha invitato a unirti alla piattaforma <strong>C.P.A. 2.0</strong> con il ruolo di: <strong>${role}</strong>.</p>
      
      <p>Per accedere, devi registrarti (o fare login) usando <strong>questa email</strong> (${email}).</p>
      
      <div style="margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accedi alla Piattaforma</a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">Se non ti aspettavi questo invito, puoi ignorare questa email.</p>
    </div>
  `;

    return sendEmail(email, subject, html);
}
