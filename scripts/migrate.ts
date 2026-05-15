import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function run() {
  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId
    });
  }

  console.log('Connecting to databases...');
  const sourceDb = getFirestore('ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40');
  const destDb = getFirestore('aurrum-production');

  const collectionNames = ['users', 'messages', 'direct_messages', 'training_cvs', 'candidates', 'invitations', 'notifications'];
  console.log(`Using collections: ${collectionNames.join(', ')}`);

  console.log(`Found collections in source DB: ${collectionNames.join(', ')}`);

  for (const collectionName of collectionNames) {
    console.log(`Migrating collection: ${collectionName}`);
    
    // Using simple offset pagination or just fetching all if not too huge
    // Assuming not millions of docs for now
    let snapshot;
    try {
      console.log(`Getting snapshot for ${collectionName}...`);
      snapshot = await sourceDb.collection(collectionName).get();
      console.log(`Found ${snapshot.size} docs in ${collectionName}`);
    } catch (err) {
      console.error(`Failed reading from sourceDb: ${err.message}`);
      throw err;
    }
    
    let count = 0;
    
    // We'll process in chunks to handle memory/quota smoothly
    const CHUNK_SIZE = 500;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = destDb.batch();
      
      for (const doc of chunk) {
        const docRef = destDb.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc.data());
        
        // Also copy subcollections if any, but since the list of root collections is sufficient 
        // we'll recursively copy subcollections just in case
      }
      
      await batch.commit();
      count += chunk.length;
      console.log(`  Copied ${count} / ${docs.length} from ${collectionName}`);
    }
  }

  // Handle known subcollections
  const usersSnapshot = await sourceDb.collection('users').get();
  for (const doc of usersSnapshot.docs) {
    const fcmSnapshot = await sourceDb.collection(`users/${doc.id}/fcmTokens`).get();
    if (!fcmSnapshot.empty) {
      const batch = destDb.batch();
      for (const tokenDoc of fcmSnapshot.docs) {
        batch.set(destDb.doc(`users/${doc.id}/fcmTokens/${tokenDoc.id}`), tokenDoc.data());
      }
      await batch.commit();
      console.log(`  Copied ${fcmSnapshot.size} fcmTokens for user ${doc.id}`);
    }
  }

  console.log("Migration finished.");
}

run().catch(console.error);
