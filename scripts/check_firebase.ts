import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function check() {
  const app = initializeApp();
  console.log('Project ID:', app.options.projectId || process.env.GOOGLE_CLOUD_PROJECT);
  
  const db = getFirestore();
  const col = await db.collection('users').limit(1).get();
  console.log('Successfully accessed (default) users:', col.size);
  
  try {
    const oldDb = getFirestore('ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40');
    const oldCol = await oldDb.collection('users').limit(1).get();
    console.log('Successfully accessed old DB users:', oldCol.size);
  } catch (err: any) {
    console.error('Error accessing old DB:', err.message);
  }

  try {
    const newDb = getFirestore('aurrum-production');
    const newCol = await newDb.collection('users').limit(1).get();
    console.log('Successfully accessed new DB users:', newCol.size);
  } catch (err: any) {
    console.error('Error accessing new DB:', err.message);
  }
}

check().catch(console.error);
