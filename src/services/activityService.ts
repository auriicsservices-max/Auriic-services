import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function logActivity(
  author: string,
  authorUid: string,
  role: string,
  action: string,
  candidateName: string,
  affectedUser: string | null,
  purpose: string,
  module: string
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
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
