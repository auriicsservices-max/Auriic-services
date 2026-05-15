import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db as sourceDb } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Database, AlertCircle, CheckCircle } from 'lucide-react';

export default function MigrationTool() {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const startMigration = async () => {
    setMigrating(true);
    setProgress('Initializing connection to production DB...');
    setError(null);
    setDone(false);

    try {
      // Initialize secondary app
      const destConfig = { ...firebaseConfig, firestoreDatabaseId: 'aurrum-production' };
      const destApp = initializeApp(destConfig, 'production-app');
      const destDb = getFirestore(destApp, 'aurrum-production');

      const collectionsList = [
        'users',
        'messages',
        'direct_messages',
        'training_cvs',
        'candidates',
        'invitations',
        'notifications',
        'typing_states'
      ];

      for (const colName of collectionsList) {
        setProgress(`Reading ${colName}...`);
        const snapshot = await getDocs(collection(sourceDb, colName));
        
        let count = 0;
        let batch = writeBatch(destDb);
        let batchCount = 0;

        for (const dlDoc of snapshot.docs) {
          const docRef = doc(destDb, colName, dlDoc.id);
          batch.set(docRef, dlDoc.data());
          batchCount++;
          count++;

          // Subcollection for users: fcmTokens
          if (colName === 'users') {
            const fcmSnap = await getDocs(collection(sourceDb, `users/${dlDoc.id}/fcmTokens`));
            for (const fcmDoc of fcmSnap.docs) {
              const fcmRef = doc(destDb, `users/${dlDoc.id}/fcmTokens/${fcmDoc.id}`);
              batch.set(fcmRef, fcmDoc.data());
              batchCount++;
            }
          }

          if (batchCount >= 400) {
            setProgress(`Writing ${colName} (${count}/${snapshot.size})...`);
            await batch.commit();
            batch = writeBatch(destDb);
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          setProgress(`Writing ${colName} (${count}/${snapshot.size})...`);
          await batch.commit();
        }
      }

      setDone(true);
      setProgress('Successfully migrated all data to aurrum-production!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during migration');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-[2rem] p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border-color)]">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Production Database Migration</h2>
            <p className="text-sm text-[var(--text-secondary)] font-medium">Migrate all data from the current database to the aurrum-production database.</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl flex gap-3 border border-rose-100 dark:border-rose-800/50 mb-8">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">Migration Error</h4>
              <p className="text-[12px] text-rose-700 dark:text-rose-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {done && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl flex gap-3 border border-emerald-100 dark:border-emerald-800/50 mb-8">
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Success</h4>
              <p className="text-[12px] text-emerald-700 dark:text-emerald-300 mt-1">{progress}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-4 border-t border-[var(--border-color)] pt-8">
          <button
            onClick={startMigration}
            disabled={migrating || done}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            {migrating ? 'Migrating...' : 'Start Migration'}
          </button>
          
          {migrating && (
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
              {progress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
