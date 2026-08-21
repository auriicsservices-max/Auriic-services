import * as admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {
  projectId: "ai-studio-applet-webapp-ddf84",
  firestoreDatabaseId: "aurrum-production"
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[FirebaseAdmin] Could not read firebase-applet-config.json, using fallback config.');
}

let cachedAdminDb: admin.firestore.Firestore | null = null;
let cachedAdminMessaging: admin.messaging.Messaging | null = null;

export function getAdminApp() {
  if (!getApps().length) {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      console.log('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT present:', !!serviceAccountJson);
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId
        });
        console.log('[FirebaseAdmin] Admin SDK initialized with Service Account for Project:', firebaseConfig.projectId);
      } else {
        console.log('[FirebaseAdmin] WARNING: FIREBASE_SERVICE_ACCOUNT env var is missing! Trying ADC / Default.');
        initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log('[FirebaseAdmin] Admin SDK initialized with Project ID:', firebaseConfig.projectId);
      }
    } catch (initErr) {
      console.error('[FirebaseAdmin] Admin SDK Initialization Error:', initErr);
      try {
        initializeApp({ projectId: firebaseConfig.projectId });
      } catch (fallbackErr) {
        console.error('[FirebaseAdmin] Fallback initialization failed:', fallbackErr);
      }
    }
  }
  return admin.app();
}

export function getAdminDb(): admin.firestore.Firestore {
  if (cachedAdminDb) {
    return cachedAdminDb;
  }

  const app = getAdminApp();
  const dbId = firebaseConfig.firestoreDatabaseId || 'aurrum-production';
  
  try {
    cachedAdminDb = getFirestore(app, dbId);
    console.log('[FirebaseAdmin] Firestore DB initialized successfully for DB:', dbId);
  } catch (e) {
    console.warn('[FirebaseAdmin] Failed to init named db:', dbId, 'falling back to default Firestore instance');
    try {
      cachedAdminDb = getFirestore(app);
    } catch (fallbackE) {
      console.error('[FirebaseAdmin] Critical: Failed to initialize any Firestore instance:', fallbackE);
      throw new Error('Firestore database not initialized.');
    }
  }

  return cachedAdminDb;
}

export function getAdminMessaging(): admin.messaging.Messaging | null {
  if (cachedAdminMessaging) {
    return cachedAdminMessaging;
  }
  try {
    const app = getAdminApp();
    cachedAdminMessaging = admin.messaging(app);
  } catch (e) {
    console.warn('[FirebaseAdmin] Messaging unavailable:', (e as Error).message);
  }
  return cachedAdminMessaging;
}
