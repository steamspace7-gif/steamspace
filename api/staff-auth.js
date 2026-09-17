import {
  buildStaffCookieHeader,
  createStaffCookieValue,
} from '../lib/staff-gate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STAFF_GATE_PASSWORD;
  if (!secret) {
    return res.status(503).json({ error: 'Staff gate is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (password !== secret) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const cookieValue = await createStaffCookieValue(secret);
  res.setHeader('Set-Cookie', buildStaffCookieHeader(cookieValue));
  return res.status(200).json({ ok: true });
}
