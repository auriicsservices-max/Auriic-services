import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const formatNotificationMessage = (
  userName: string,
  userRole: string,
  message: string
) => {
  return `${userName} (${userRole})\n${message}`;
};

export async function createNotification(
  text: string, 
  senderId: string, 
  senderName: string, 
  senderRole: string,
  recipientId: string, 
  relatedCandidateId?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      text,
      senderId,
      senderName,
      senderRole,
      recipientId,
      relatedCandidateId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
