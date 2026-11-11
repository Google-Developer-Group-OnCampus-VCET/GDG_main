# Admin User Bootstrap

There is no public HTTP endpoint that can grant `super-admin` — this is deliberate. The only
way to create the first privileged account is the CLI script below, run by a trusted operator
with access to either the emulator or (in production) real Firebase Admin SDK credentials.

```bash
npm run bootstrap-admin                    # defaults to lead@vcet.edu.in
npm run bootstrap-admin -- someone@else.com
```

What it does (`scripts/bootstrap-admin.ts`):
1. Looks up the SQLite profile by email — fails loudly if it doesn't exist (seed it first, or
   create it via `POST /api/admin/team` once at least one admin already exists).
2. Creates a Firebase Auth user for that email if one doesn't already exist (reuses it if it
   does — safe to re-run).
3. Links the SQLite row to that Firebase UID (`firebase_uid` column) and sets
   `role = "super-admin"`, `status = "active"`.
4. Generates a password-reset link and prints it — this is what the real first admin uses to
   set their password and sign in at `/admin/login`.

After this, every subsequent admin is created through `POST /api/admin/team` by someone who
already has `manage_team` — only a `super-admin` can grant the `super-admin` role to a new
invite (enforced in the route, not just a UI convention).

## Disabling the bootstrap path after use

This is a script, not a route — there's nothing to "disable" in the running application. The
operational control is: don't give untrusted people shell/CI access to run
`npm run bootstrap-admin` with Admin SDK credentials. Treat the service-account key the same
way you'd treat a database root password.
