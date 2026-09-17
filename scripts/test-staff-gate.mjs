import {
  createStaffCookieValue,
  isStaffCookieValid,
  isProtectedPath,
  sanitizeNextPath,
} from '../lib/staff-gate.js';

const secret = 'test-secret';

const token = await createStaffCookieValue(secret);
const valid = await isStaffCookieValid(token, secret);
const invalid = await isStaffCookieValid(token, 'wrong');

if (!valid || invalid) {
  console.error('Cookie validation failed');
  process.exit(1);
}

const paths = [
  ['/apps', true],
  ['/apps/foo', true],
  ['/mindfulness', true],
  ['/emotional-regulation', true],
  ['/', false],
  ['/choose', false],
  ['/staff-login', false],
];

for (const [path, expected] of paths) {
  if (isProtectedPath(path) !== expected) {
    console.error(`isProtectedPath(${path}) expected ${expected}`);
    process.exit(1);
  }
}

if (sanitizeNextPath('/choose') !== '/apps') {
  console.error('sanitizeNextPath should reject public paths');
  process.exit(1);
}

if (sanitizeNextPath('/mindfulness') !== '/mindfulness') {
  console.error('sanitizeNextPath should allow protected paths');
  process.exit(1);
}

console.log('staff-gate checks passed');
