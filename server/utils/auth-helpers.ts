// Hardcoded owner email as fallback (always admin)
const OWNER_EMAIL = 'albertobrando1991@gmail.com';

export const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [OWNER_EMAIL]; // Fallback to owner email if env var missing

// Staff emails (can upload podcasts and manage requests)
export const STAFF_EMAILS = process.env.STAFF_EMAILS
  ? process.env.STAFF_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [];

// Ensure owner is always in admin list
if (!ADMIN_EMAILS.includes(OWNER_EMAIL)) {
  ADMIN_EMAILS.push(OWNER_EMAIL);
}

// Log at startup to verify env vars are loaded
console.log('[AUTH-HELPERS] ADMIN_EMAILS loaded:', ADMIN_EMAILS);
console.log('[AUTH-HELPERS] STAFF_EMAILS loaded:', STAFF_EMAILS);

export function isAdmin(email?: string): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const result = ADMIN_EMAILS.includes(normalizedEmail) || normalizedEmail === OWNER_EMAIL;
  console.log(`[AUTH] isAdmin check: ${email} → ${result} (list: ${ADMIN_EMAILS.join(', ')})`);
  return result;
}

export function isStaff(email?: string): boolean {
  if (!email) return false;
  return STAFF_EMAILS.includes(email.toLowerCase()) || isAdmin(email);
}

export function isAlwaysPremium(email?: string): boolean {
  // Admin sono sempre premium
  return isAdmin(email);
}
