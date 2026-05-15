import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function testAccess() {
  initializeApp(); // Use ADC
  const destDb = getFirestore('aurrum-production');

  console.log("Testing read from aurrum-production via Admin SDK...");
  const snap = await destDb.collection('users').get();
  console.log("Read success. Size:", snap.size);
}

testAccess().catch(console.error);
