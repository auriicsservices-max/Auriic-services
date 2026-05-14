import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const OLD_DB_ID = 'ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40';
const NEW_DB_ID = 'aurrum-production';

async function migrate() {
  console.log('Starting migration...');
  
  // Use default initialization which picks up credentials from environment
  const app = initializeApp();
  
  const oldDb = getFirestore(app, OLD_DB_ID);
  const newDb = getFirestore(app, NEW_DB_ID);

  const collections = ['users', 'messages', 'direct_messages', 'training_cvs', 'candidates'];

  for (const colName of collections) {
    try {
      console.log(`Checking collection: ${colName}`);
      const snapshot = await oldDb.collection(colName).limit(1).get();
      if (snapshot.empty) {
        console.log(`Collection ${colName} is empty or doesn't exist in old DB.`);
        continue;
      }
      
      console.log(`Migrating data for ${colName}...`);
      const allDocs = await oldDb.collection(colName).get();
      console.log(`Found ${allDocs.size} documents in ${colName}`);
      
      const batch = newDb.batch();
      let count = 0;
      
      for (const doc of allDocs.docs) {
        batch.set(newDb.collection(colName).doc(doc.id), doc.data());
        count++;
        if (count % 500 === 0) {
          await batch.commit();
          console.log(`Committed 500 docs for ${colName}`);
        }
      }
      
      if (count % 500 !== 0) {
        await batch.commit();
      }
      console.log(`Finished migrating ${colName}: ${count} docs.`);
    } catch (err: any) {
      console.error(`Error migrating ${colName}:`, err.message);
    }
  }

  console.log('Migration process finished.');
}

migrate().catch(console.error);
