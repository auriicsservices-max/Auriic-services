import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const formatNotificationMessage = (
  userName: string,
  userRole: string,
  message: string
) => {
  return `${userName} (${userRole})\n${message}`;
};

export interface NotificationOptions {
  title?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  relatedCandidateId?: string;
  candidateName?: string;
  clientName?: string;
  type?: string;
}

export async function createNotification(
  textOrOptions: string | NotificationOptions,
  senderId?: string,
  senderName?: string,
  senderRole?: string,
  recipientId?: string,
  relatedCandidateId?: string
) {
  try {
    let payload: any = {};
    if (typeof textOrOptions === 'object' && textOrOptions !== null) {
      payload = {
        title: textOrOptions.title || 'CRM Notification',
        text: textOrOptions.text,
        message: textOrOptions.text,
        senderId: textOrOptions.senderId,
        senderName: textOrOptions.senderName,
        senderRole: textOrOptions.senderRole,
        recipientId: textOrOptions.recipientId,
        relatedCandidateId: textOrOptions.relatedCandidateId,
        candidateId: textOrOptions.relatedCandidateId,
        candidateName: textOrOptions.candidateName,
        clientName: textOrOptions.clientName,
        type: textOrOptions.type || 'general',
        read: false,
        createdAt: serverTimestamp()
      };
    } else {
      payload = {
        title: 'CRM Notification',
        text: textOrOptions,
        message: textOrOptions,
        senderId: senderId || 'system',
        senderName: senderName || 'System',
        senderRole: senderRole || 'System',
        recipientId: recipientId || 'all',
        relatedCandidateId,
        candidateId: relatedCandidateId,
        type: 'general',
        read: false,
        createdAt: serverTimestamp()
      };
    }

    // Optional duplicate prevention check (prevent exact same recipient + candidate + type within 1 minute)
    if (payload.recipientId && payload.relatedCandidateId && payload.type) {
      const recentQuery = query(
        collection(db, 'notifications'),
        where('recipientId', '==', payload.recipientId),
        where('relatedCandidateId', '==', payload.relatedCandidateId),
        where('type', '==', payload.type)
      );
      const snapshot = await getDocs(recentQuery);
      const now = Date.now();
      const isDuplicate = snapshot.docs.some(doc => {
        const data = doc.data();
        const dataTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
        // If created within last 30 seconds and text is identical
        return (now - dataTime < 30000) && (data.text === payload.text);
      });

      if (isDuplicate) {
        console.log('[NotificationService] Duplicate notification suppressed:', payload.text);
        return;
      }
    }

    await addDoc(collection(db, 'notifications'), payload);
  } catch (error) {
    // Notification failure must NEVER break the original CRM action
    console.error('Error creating notification (non-blocking):', error);
  }
}

export async function notifyMultiple(
  text: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  recipientIds: string[],
  relatedCandidateId?: string
) {
  try {
    await Promise.all(recipientIds.map(recipientId => 
      createNotification(text, senderId, senderName, senderRole, recipientId, relatedCandidateId)
    ));
  } catch (error) {
    console.error('Error creating multi-recipient notifications:', error);
  }
}
