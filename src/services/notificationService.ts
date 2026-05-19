import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function createNotification(
  senderName: string,
  senderRole: string,
  action: string,
  candidateName: string,
  receiverName: string,
  purpose: string,
  module: string,
  recipientId: string, 
  relatedCandidateId?: string
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      senderName,
      senderRole,
      action,
      candidateName,
      receiverName,
      purpose,
      module,
      recipientId,
      relatedCandidateId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
