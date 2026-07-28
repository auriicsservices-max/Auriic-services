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

// Wrap in try/catch and browser checks to avoid errors in unsupported browsers/iframe environments
let messagingInstance: any = null;

const isMessagingSupported = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    
    try {
        // Cross-origin safe iframe check
        const isIframe = window.self !== window.top;
        if (isIframe && !('serviceWorker' in navigator)) return false;
    } catch (e) {
        return false;
    }

    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        typeof window.indexedDB !== 'undefined'
    );
};

if (isMessagingSupported()) {
    try {
        messagingInstance = getMessaging(app);
    } catch (err) {
        console.warn('[Firebase] Messaging failed to initialize:', err);
    }
} else {
    console.log('[Firebase] Messaging not supported in this environment/browser.');
}

export const messaging = messagingInstance;
