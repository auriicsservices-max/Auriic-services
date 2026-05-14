import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

const OLD_DB_ID = 'ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40';
const NEW_DB_ID = 'aurrum-production';

async function migrate() {
  console.log('Starting migration using Client SDK...');
  
  // Initialize with old DB
  const oldApp = initializeApp(firebaseConfig, 'old-app');
  const oldDb = getFirestore(oldApp, OLD_DB_ID);

  // Initialize with new DB
  const newApp = initializeApp(firebaseConfig, 'new-app');
  const newDb = getFirestore(newApp, NEW_DB_ID);

  const collections = ['users', 'messages', 'direct_messages', 'training_cvs', 'candidates'];

  for (const colName of collections) {
    console.log(`Checking collection: ${colName}`);
    try {
      const snapshot = await getDocs(collection(oldDb, colName));
      console.log(`Found ${snapshot.size} documents in ${colName}`);
      
      let count = 0;
      for (const d of snapshot.docs) {
        await setDoc(doc(newDb, colName, d.id), d.data());
        count++;
        if (count % 10 === 0) console.log(`Migrated ${count} docs for ${colName}`);
      }
      console.log(`Finished migrating ${colName}: ${count} docs.`);
    } catch (err: any) {
      console.error(`Error migrating ${colName}:`, err.message);
    }
  }

  console.log('Migration process finished.');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
