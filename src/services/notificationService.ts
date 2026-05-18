import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationParams {
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  candidateName: string;
  action: string;
  purpose: string;
  relatedCandidateId?: string;
}

export async function createNotification(params: NotificationParams) {
  const {
    senderId,
    senderName,
    senderRole,
    recipientId,
    recipientName,
    recipientRole,
    candidateName,
    action,
    purpose,
    relatedCandidateId
  } = params;

  // Validation & Fallbacks
  const cleanData = {
    senderId: senderId || 'system',
    senderName: senderName || 'Aurrum System',
    senderRole: senderRole || 'System',
    recipientId: recipientId || 'all',
    recipientName: recipientName || 'Team',
    recipientRole: recipientRole || 'Staff',
    candidateName: candidateName || 'Unknown Candidate',
    action: action || 'Notification update',
    purpose: purpose || 'System activity update',
    relatedCandidateId: relatedCandidateId || '',
    read: false,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'notifications'), cleanData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export function createSystemNotification(
  recipientId: string,
  recipientName: string,
  recipientRole: string,
  candidateName: string,
  action: string,
  purpose: string,
  relatedCandidateId?: string
) {
  return createNotification({
    senderId: 'system',
    senderName: 'Aurrum System',
    senderRole: 'System',
    recipientId,
    recipientName,
    recipientRole,
    candidateName,
    action,
    purpose,
    relatedCandidateId
  });
}
