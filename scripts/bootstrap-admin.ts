/**
 * One-time operational script: links the seeded `lead@vcet.edu.in` SQLite admin profile to a
 * real Firebase Auth identity and grants super-admin. There is deliberately no public HTTP
 * endpoint for this — it only runs from a trusted operator's machine / CI job via:
 *
 *   npx tsx scripts/bootstrap-admin.ts [email]
 *
 * Defaults to lead@vcet.edu.in if no email is given. Safe to re-run: if the Firebase user or
 * the SQLite link already exist, it reuses them instead of erroring.
 */
import { getAdminUserByEmail, linkFirebaseUid, updateAdminUserRole, updateAdminUserStatus } from "@/lib/db";
import { createFirebaseUser, generatePasswordResetLink, getFirebaseUserByEmail } from "@/lib/firebase/auth";

async function main() {
  const email = (process.argv[2] || "lead@vcet.edu.in").trim().toLowerCase();

  const profile = getAdminUserByEmail(email);
  if (!profile) {
    console.error(`No SQLite admin profile found for ${email}. Seed it first (or create it via the team API).`);
    process.exit(1);
  }

  let firebaseUid = (await getFirebaseUserByEmail(email))?.uid;
  if (!firebaseUid) {
    const created = await createFirebaseUser({ email, displayName: profile.name });
    firebaseUid = created.uid;
    console.log(`Created Firebase Auth user ${firebaseUid} for ${email}.`);
  } else {
    console.log(`Reusing existing Firebase Auth user ${firebaseUid} for ${email}.`);
  }

  linkFirebaseUid(profile.id, firebaseUid);
  updateAdminUserRole(profile.id, "super-admin");
  updateAdminUserStatus(profile.id, "active");

  const resetLink = await generatePasswordResetLink(email);
  console.log(`\nBootstrap complete. ${email} is now linked and is super-admin.`);
  console.log(`Password-reset link (send this to them manually, or email it once a provider is configured):`);
  console.log(resetLink);
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
