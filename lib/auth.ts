// Static credentials. Override via AUTH_USERNAME / AUTH_PASSWORD in .env.
export const AUTH_USERNAME = process.env.AUTH_USERNAME || 'jasminshukla';
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'jess@3110';
export const AUTH_COOKIE = 'session';

// Deterministic session token derived from the credentials (Web Crypto, works in proxy + routes).
export async function sessionToken() {
  const data = new TextEncoder().encode(`${AUTH_USERNAME}:${AUTH_PASSWORD}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
