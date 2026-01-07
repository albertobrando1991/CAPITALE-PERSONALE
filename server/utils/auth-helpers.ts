export const ADMIN_EMAILS = [
  'albertobrando1991@gmail.com',
  'dev@trae-ai.com', // Per test
];

// Staff emails (can upload podcasts and manage requests)
export const STAFF_EMAILS = [
  'staff@trae-ai.com',
  'support@trae-ai.com',
];

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
