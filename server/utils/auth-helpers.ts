export const ADMIN_EMAILS = process.env.ADMIN_EMAILS 
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : []; // Nessun admin di default se manca env var

// Staff emails (can upload podcasts and manage requests)
export const STAFF_EMAILS = process.env.STAFF_EMAILS
  ? process.env.STAFF_EMAILS.split(',').map(email => email.trim())
  : [];

export function isAdmin(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isStaff(email?: string): boolean {
  if (!email) return false;
  return STAFF_EMAILS.includes(email.toLowerCase()) || isAdmin(email);
}

export function isAlwaysPremium(email?: string): boolean {
  // Admin sono sempre premium
  return isAdmin(email);
}
