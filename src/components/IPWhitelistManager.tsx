import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';

export default function IPWhitelistManager() {
  const [ips, setIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    const fetchIps = async () => {
      const docRef = doc(db, 'settings', 'ip_whitelist');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIps(docSnap.data().ips || []);
      }
    };
    fetchIps();
  }, []);

  const addIp = async () => {
    if (!newIp) return;
    const docRef = doc(db, 'settings', 'ip_whitelist');
    await setDoc(docRef, { ips: arrayUnion(newIp) }, { merge: true });
    setIps([...ips, newIp]);
    setNewIp('');
  };

  const removeIp = async (ip: string) => {
    const docRef = doc(db, 'settings', 'ip_whitelist');
    await updateDoc(docRef, { ips: arrayRemove(ip) });
    setIps(ips.filter(i => i !== ip));
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold mb-4">IP Whitelist Management</h3>
      <div className="flex gap-2 mb-4">
        <input 
            value={newIp} 
            onChange={(e) => setNewIp(e.target.value)} 
            placeholder="Enter IPv4 or IPv6"
            className="flex-1 p-2 border rounded"
        />
        <button onClick={addIp} className="bg-indigo-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      <ul className="space-y-2">
        {ips.map(ip => (
            <li key={ip} className="flex justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded">
                <span>{ip}</span>
                <button onClick={() => removeIp(ip)} className="text-red-500 text-sm">Remove</button>
            </li>
        ))}
      </ul>
    </div>
  );
}
