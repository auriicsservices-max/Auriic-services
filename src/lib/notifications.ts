import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const createNotification = async (
    userId: string,
    title: string,
    body: string,
    type: string,
    data: any = {}
) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            userId,
            title,
            body,
            type,
            read: false,
            createdAt: serverTimestamp(),
            data
        });
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};
