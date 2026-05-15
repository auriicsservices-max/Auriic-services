import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Safe storage getter
export const getFirebaseStorage = () => {
    try {
        return getStorage(app);
    } catch (err) {
        return null;
    }
};

// Wrap in check for window/typeof navigator to avoid errors in node env
export const messaging = typeof document !== 'undefined' ? getMessaging(app) : null;
