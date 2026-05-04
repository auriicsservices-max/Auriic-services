import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export const useNotifications = () => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const requestPermission = async () => {
            if (!auth.currentUser) return;
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                try {
                    const currentToken = await getToken(messaging, {
                        vapidKey: 'BM6jO0aZ1n_nS6Z9q5J0S9A0nO4lB1P6N0S0h0s' // NOTE: This needs to be a real VAPID key from Firebase Console
                    });
                    if (currentToken) {
                        setToken(currentToken);
                        await setDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', currentToken), {
                            token: currentToken,
                            createdAt: new Date()
                        });
                    }
                } catch (err) {
                    console.error('An error occurred while retrieving token. ', err);
                }
            }
        };

        requestPermission();

        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Handle foreground messages here, maybe show a toast
        });
    }, [auth.currentUser]);

    return { token };
};
