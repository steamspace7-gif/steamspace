import {
  getCookieFromRequest,
  isProtectedPath,
  isStaffCookieValid,
  sanitizeNextPath,
  STAFF_COOKIE_NAME,
} from './lib/staff-gate.js';

export default async function middleware(request) {
  const { pathname, search } = new URL(request.url);

  if (!isProtectedPath(pathname)) {
    return;
  }

  const secret = process.env.STAFF_GATE_PASSWORD;
  const cookieValue = getCookieFromRequest(request, STAFF_COOKIE_NAME);
  const isAuthorized = await isStaffCookieValid(cookieValue, secret);

  if (isAuthorized) {
    return;
  }

  const loginUrl = new URL('/staff-login', request.url);
  loginUrl.searchParams.set('next', sanitizeNextPath(pathname + search));

  return Response.redirect(loginUrl.toString(), 302);
}

export const config = {
  matcher: [
    '/apps',
    '/apps/:path*',
    '/mindfulness',
    '/mindfulness/:path*',
    '/emotional-regulation',
    '/emotional-regulation/:path*',
  ],
};
