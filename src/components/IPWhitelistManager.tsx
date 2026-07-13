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
    <div className="p-6 bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border-color)] shadow-sm transition-colors duration-300">
      <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider mb-4">IP Whitelist Gatekeeper</h3>
      <div className="flex gap-3 mb-4">
        <input 
            value={newIp} 
            onChange={(e) => setNewIp(e.target.value)} 
            placeholder="Enter IPv4 or IPv6 address..."
            className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-[var(--text-muted)]"
        />
        <button onClick={addIp} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10">Add Rule</button>
      </div>
      <ul className="space-y-2">
        {ips.map(ip => (
            <li key={ip} className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)]/70 rounded-xl text-xs font-bold text-[var(--text-secondary)]">
                <span className="font-mono">{ip}</span>
                <button onClick={() => removeIp(ip)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 p-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all">Remove</button>
            </li>
        ))}
      </ul>
    </div>
  );
}
