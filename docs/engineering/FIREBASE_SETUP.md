# Firebase Setup

This app was built and verified against the **Firebase Local Emulator Suite**, not a live
project — no live Firebase credentials were available during implementation. Nothing here
claims a live connection was tested; the steps below are what you run to go live.

## Local development (emulators)

1. Install Java 21+ (required by `firebase-tools`, even for the Auth/Storage emulators — not
   available in the environment this was built in, so emulator-backed tests described in
   `TESTING_AND_QA.md` have not actually been executed; run them yourself once Java is present).
2. `firebase login` (one-time, interactive).
3. Set in `.env.local`:
   ```
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
   NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=gdg-vcet-dev
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gdg-vcet-dev.appspot.com
   ```
   (Any string works for `FIREBASE_PROJECT_ID`/`NEXT_PUBLIC_FIREBASE_PROJECT_ID` against the
   emulator — it does not need to be a real project.)
4. `npm run emulators` (starts Auth + Storage emulators + the Emulator UI on :4000).
5. In another terminal: `npm run dev`.
6. `npm run bootstrap-admin` — creates/links the `lead@vcet.edu.in` Firebase identity in the
   emulator and grants `super-admin`. Prints a password-reset link; open it to set a password,
   then sign in at `/admin/login`.

## Going live (real Firebase project)

1. Create a project at the Firebase Console.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Enable **Storage**, note the default bucket name.
4. Project Settings → General → "Your apps" → add a Web app → copy the client config into:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Project Settings → Service Accounts → Generate new private key → use its three fields for:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   (keep the `\n` escapes in `FIREBASE_PRIVATE_KEY` as they appear in the downloaded JSON —
   `src/lib/firebase/config.ts#normalizePrivateKey` converts them back to real newlines.)
6. Leave `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST` unset in production.
7. Deploy storage rules: `npx firebase deploy --only storage` (uses `storage.rules` /
   `firebase.json` at the repo root).
8. Add your production domain to **Authentication → Settings → Authorized domains**.
9. Run `npm run bootstrap-admin` once against the real project (unset the emulator env vars
   first) to create the real first super-admin.
10. Configure `RESEND_API_KEY` / `EMAIL_FROM` if you want announcement "publish" to actually
    send email — until then, announcements stay in `draft` status by design (see
    `AUTHENTICATION_ARCHITECTURE.md` is not relevant here; see `SECURITY_REMEDIATION_REPORT.md`
    SEC item on announcement delivery honesty).

Never commit a service-account JSON or paste `FIREBASE_PRIVATE_KEY`'s value anywhere other
than your deployment platform's encrypted environment variable store.
