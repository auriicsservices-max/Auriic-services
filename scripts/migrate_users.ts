import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function migrateUsers() {
  console.log("Initializing...");

  // Source App (Old Database)
  const sourceConfig = { ...firebaseConfig, firestoreDatabaseId: 'ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40' };
  const sourceApp = initializeApp(sourceConfig, 'source');
  const sourceDb = getFirestore(sourceApp, 'ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40');

  // Destination App (New Database)
  const destConfig = { ...firebaseConfig, firestoreDatabaseId: 'aurrum-production' };
  const destApp = initializeApp(destConfig, 'dest');
  const destDb = getFirestore(destApp, 'aurrum-production');

  console.log("Reading users from source...");
  const usersSnap = await getDocs(collection(sourceDb, 'users'));
  
  let batch = writeBatch(destDb);
  let count = 0;
  let batchCount = 0;

  for (const dlDoc of usersSnap.docs) {
    const docRef = doc(destDb, 'users', dlDoc.id);
    batch.set(docRef, dlDoc.data());
    batchCount++;
    count++;

    if (batchCount >= 400) {
      console.log(`Writing users batch (${count}/${usersSnap.size})...`);
      await batch.commit();
      batch = writeBatch(destDb);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    console.log(`Writing final users batch (${count}/${usersSnap.size})...`);
    await batch.commit();
  }

  console.log(`Successfully copied ${count} users, preserving their roles!`);
}

migrateUsers().catch(console.error);
