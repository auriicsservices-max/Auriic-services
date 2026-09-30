import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Usage: npx tsx scripts/create_admin_user.ts <email> <password> [name] [role]
// Or via env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE

const EMAIL = process.argv[2] || process.env.ADMIN_EMAIL;
const PASSWORD = process.argv[3] || process.env.ADMIN_PASSWORD;
const NAME = process.argv[4] || process.env.ADMIN_NAME || EMAIL?.split('@')[0] || 'Admin';
const ROLE = process.argv[5] || process.env.ADMIN_ROLE || 'admin';

async function createAdminUser() {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing email/password. Usage: npx tsx scripts/create_admin_user.ts <email> <password> [name] [role]');
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is missing.');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

  const auth = getAuth(app);
  const db = getFirestore(app, 'aurrum-production');

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(EMAIL);
    console.log(`User already exists in Firebase Auth: ${userRecord.uid}, updating password...`);
    await auth.updateUser(userRecord.uid, { password: PASSWORD });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: EMAIL,
        password: PASSWORD,
        displayName: NAME,
        emailVerified: true,
      });
      console.log(`Created new Firebase Auth user: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: EMAIL,
    name: NAME,
    role: ROLE,
    createdAt: new Date().toISOString(),
    isArchived: false,
    status: 'offline',
  }, { merge: true });

  console.log(`Firestore user document created/updated for uid: ${userRecord.uid}, role: ${ROLE}`);
}

createAdminUser()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to create admin user:', err.message || err);
    process.exit(1);
  });
