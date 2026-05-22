import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function listAndDeleteCandidates() {
  console.log(`Listing candidates to find the faulty one...`);
  
  const q = collection(db, 'candidates');
  const querySnapshot = await getDocs(q);
  
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    console.log(`ID: ${doc.id}, FullName: ${data.fullName}, OriginalFile: ${data.originalFileName}`);

    if (data.fullName && (data.fullName as string).includes('victor-grajski-resume')) {
        console.log(`Deleting faulty candidate: ${doc.id}`);
        await deleteDoc(doc.ref);
    }
  }
}

listAndDeleteCandidates().catch(console.error);
