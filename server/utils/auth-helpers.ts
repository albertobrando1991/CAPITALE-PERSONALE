export const ADMIN_EMAILS = [
  'albertobrando1991@gmail.com',
  'dev@trae-ai.com', // Per test
];

export function isAdmin(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isAlwaysPremium(email?: string): boolean {
  // Admin sono sempre premium
  return isAdmin(email);
}
