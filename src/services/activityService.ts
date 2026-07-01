import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function logActivity(
  author: string,
  authorUid: string,
  role: string,
  action: string,
  candidateName: string,
  affectedUser: string | null,
  purpose: string,
  module: string,
  status: string = 'Success',
  ip: string | null = null,
  device: string | null = null,
  oldValue: string | null = null,
  newValue: string | null = null
) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      author,
      authorUid,
      role,
      action,
      candidateName,
      affectedUser,
      purpose,
      module,
      status,
      ip,
      device,
      oldValue,
      newValue,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
