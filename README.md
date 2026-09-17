# STEAMSPACE

Apache Behavioral Health Services STEM field-trip site and staff SEL tools, hosted at [steamspace.vercel.app](https://steamspace.vercel.app).

## Staff password gate

Staff-only SEL tools (`/apps`, `/mindfulness`, `/emotional-regulation`) are protected by a shared password gate. Public field-trip pages stay open.

### Vercel environment variable (required)

Add this in **Vercel → Project → Settings → Environment Variables** for **Production** and **Preview**:

| Name | Value |
|------|-------|
| `STAFF_GATE_PASSWORD` | *(shared staff password — set in Vercel only, never in git)* |

The gate will not work until this variable is set. Redeploy after adding it.

### How to test

1. Visit a protected path, e.g. [https://steamspace.vercel.app/apps](https://steamspace.vercel.app/apps) — you should be redirected to `/staff-login`.
2. Enter the staff password and submit — you should land on `/apps`.
3. Open [https://steamspace.vercel.app/mindfulness](https://steamspace.vercel.app/mindfulness) and [https://steamspace.vercel.app/emotional-regulation](https://steamspace.vercel.app/emotional-regulation) — both should load without signing in again (one cookie unlocks all three).
4. Confirm public pages still work without login, e.g. `/`, `/choose`, `/field-trip-prep`.
5. Optional sign-out: visit `/api/staff-logout`, then try `/apps` again — you should be redirected to login.
6. Wrong password shows a gentle error on the login page.

### Search indexing

Staff areas remain `noindex`:

- `<meta name="robots" content="noindex, nofollow">` on staff tool pages and `/staff-login`
- `X-Robots-Tag: noindex, nofollow` headers in `vercel.json` for `/apps`, `/mindfulness`, `/emotional-regulation`, and `/staff-login`

Public field-trip pages are unchanged.
