/** Shared staff gate helpers (Edge middleware + serverless API). */

export const STAFF_COOKIE_NAME = 'staff_gate';
export const STAFF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const STAFF_COOKIE_PAYLOAD = 'staff_access_v1';

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

export async function createStaffCookieValue(secret) {
  if (!secret) return null;
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(STAFF_COOKIE_PAYLOAD)
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function isStaffCookieValid(cookieValue, secret) {
  if (!cookieValue || !secret) return false;
  const expected = await createStaffCookieValue(secret);
  return cookieValue === expected;
}

export function buildStaffCookieHeader(value) {
  const parts = [
    `${STAFF_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${STAFF_COOKIE_MAX_AGE}`,
  ];
  return parts.join('; ');
}

export function buildStaffCookieClearHeader() {
  const parts = [
    `${STAFF_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  return parts.join('; ');
}

export function getCookieFromRequest(request, name) {
  const header = request.headers.get('cookie') || '';
  const pattern = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const match = header.match(pattern);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isProtectedPath(pathname) {
  return (
    pathname === '/apps' ||
    pathname.startsWith('/apps/') ||
    pathname === '/mindfulness' ||
    pathname.startsWith('/mindfulness/') ||
    pathname === '/emotional-regulation' ||
    pathname.startsWith('/emotional-regulation/')
  );
}

export function sanitizeNextPath(nextPath) {
  if (!nextPath || typeof nextPath !== 'string') return '/apps';
  if (!nextPath.startsWith('/')) return '/apps';
  if (nextPath.startsWith('//')) return '/apps';
  if (!isProtectedPath(nextPath.split('?')[0])) return '/apps';
  return nextPath;
}
