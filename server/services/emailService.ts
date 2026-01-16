
import nodemailer from "nodemailer";

// Configuration for email service
// In production, these should be environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "noreply@capitalepersonale.it"; // Placeholder
const SMTP_PASS = process.env.SMTP_PASS || "your-password"; // Placeholder
const EMAIL_FROM = process.env.EMAIL_FROM || '"Capitale Personale" <noreply@capitalepersonale.it>';

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(email: string, firstName: string) {
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
    console.log(`[EMAIL-MOCK] Would send Welcome Email to ${email} (No SMTP configured)`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      replyTo: "no-reply@capitalepersonale.it", // Prevent replies
      headers: {
        "Auto-Submitted": "auto-generated", // Mark as automated email
        "X-Auto-Response-Suppress": "OOF, DR, RN, NRN, OON, AutoReply" // Suppress auto-replies
      },
      to: email,
      subject: "Benvenuto in Capitale Personale!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Benvenuto, ${firstName}!</h1>
          <p>Grazie per esserti registrato a <strong>Capitale Personale</strong>.</p>
          <p>Siamo felici di averti a bordo nel tuo percorso di preparazione ai concorsi pubblici.</p>
          <p>Puoi accedere subito alla tua dashboard e iniziare a studiare.</p>
          <br>
          <a href="https://capitalepersonale.it/login" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accedi al sito</a>
          <br><br>
          <p>Buono studio,<br>Il team di Capitale Personale</p>
        </div>
      `,
    });
    console.log("Welcome email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
}

/**
 * Send an invitation email to a staff member
 */
export async function sendStaffInvitation(email: string, token: string, inviterName: string) {
  const inviteLink = `${process.env.APP_URL || 'https://capitalepersonale.it'}/register?token=${token}`;

  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS) {
    console.log(`[EMAIL-MOCK] Would send Invitation Email to ${email} with link: ${inviteLink}`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      replyTo: "no-reply@capitalepersonale.it",
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "OOF, DR, RN, NRN, OON, AutoReply"
      },
      to: email,
      subject: "Invito a collaborare su Capitale Personale",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Sei stato invitato!</h1>
          <p>Ciao,</p>
          <p><strong>${inviterName}</strong> ti ha invitato a unirti al team di <strong>Capitale Personale</strong> come membro dello staff.</p>
          <p>Clicca sul pulsante qui sotto per accettare l'invito e creare il tuo account.</p>
          <br>
          <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accetta Invito</a>
          <br><br>
          <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
          <p>${inviteLink}</p>
          <br>
          <p>Questo invito scadrà tra 48 ore.</p>
        </div>
      `,
    });
    console.log("Invitation email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}
