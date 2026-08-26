import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
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
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log('[FirebaseAdmin] FIREBASE_SERVICE_ACCOUNT present:', !!serviceAccountJson);
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
          initializeApp({
            credential: cert(serviceAccount),
            projectId: firebaseConfig.projectId || serviceAccount.project_id
          });
          console.log('[FirebaseAdmin] Admin SDK initialized with Service Account for Project:', firebaseConfig.projectId);
        } else {
          throw new Error('Service account JSON is missing required fields (private_key or client_email)');
        }
      } catch (parseErr: any) {
        console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseErr.message);
        initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log('[FirebaseAdmin] Admin SDK initialized with Project ID (Fallback due to invalid service account):', firebaseConfig.projectId);
      }
    } else {
      console.log('[FirebaseAdmin] WARNING: FIREBASE_SERVICE_ACCOUNT env var is missing! Trying ADC / Default.');
      initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log('[FirebaseAdmin] Admin SDK initialized with Project ID:', firebaseConfig.projectId);
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
  
  cachedAdminDb = getFirestore(app, dbId);
  if (!cachedAdminDb) {
    throw new Error('Firestore database not initialized.');
  }
  console.log('[FirebaseAdmin] Firestore DB initialized successfully for DB:', dbId);
  return cachedAdminDb;
}

export function getAdminMessaging(): admin.messaging.Messaging {
  if (cachedAdminMessaging) {
    return cachedAdminMessaging;
  }
  const app = getAdminApp();
  cachedAdminMessaging = getMessaging(app);
  return cachedAdminMessaging;
}

