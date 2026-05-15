import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function exportData() {
  const app = initializeApp(firebaseConfig);
  // use the old database!
  const db = getFirestore(app, 'ai-studio-0b5a4f3f-fec8-4f11-848c-dbcc17a31b40');

  const collectionNames = ['users', 'messages', 'direct_messages', 'training_cvs', 'candidates', 'invitations', 'notifications'];
  const data: any = {};

  for (const name of collectionNames) {
    console.log(`Exporting ${name}...`);
    const snap = await getDocs(collection(db, name));
    data[name] = [];
    for (const doc of snap.docs) {
      const docData = doc.data();
      if (name === 'users') {
          const fcmSnap = await getDocs(collection(db, `users/${doc.id}/fcmTokens`));
          const tokens = fcmSnap.docs.map(t => ({ id: t.id, data: t.data() }));
          data[name].push({ id: doc.id, data: docData, fcmTokens: tokens });
      } else {
          data[name].push({ id: doc.id, data: docData });
      }
    }
    console.log(`  Exported ${snap.size} docs from ${name}`);
  }

  fs.writeFileSync('data_backup.json', JSON.stringify(data, null, 2));
  console.log('Exported to data_backup.json');
}

exportData().catch(console.error);
