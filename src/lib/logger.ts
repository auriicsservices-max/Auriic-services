import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function logActivity(action: string, details: any, userId: string, userRole: string) {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      action,
      details,
      userId,
      userRole,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
