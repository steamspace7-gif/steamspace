import { buildStaffCookieClearHeader } from '../lib/staff-gate.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', buildStaffCookieClearHeader());
  res.writeHead(302, { Location: '/staff-login' });
  res.end();
}
