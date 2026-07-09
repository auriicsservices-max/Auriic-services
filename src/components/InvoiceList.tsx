import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { FileText, Loader2 } from 'lucide-react';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'consolidated_invoices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoicesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-gold-a98b" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">Client Invoices</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="p-4 text-slate-600 dark:text-slate-300 font-semibold">Client</th>
              <th className="p-4 text-slate-600 dark:text-slate-300 font-semibold">Candidates Count</th>
              <th className="p-4 text-slate-600 dark:text-slate-300 font-semibold">Total Amount</th>
              <th className="p-4 text-slate-600 dark:text-slate-300 font-semibold">Status</th>
              <th className="p-4 text-slate-600 dark:text-slate-300 font-semibold">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="p-4 font-semibold">{inv.clientName}</td>
                <td className="p-4">{inv.candidates?.length || 0}</td>
                <td className="p-4">${inv.totalAmount?.toFixed(2) || '0.00'}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${inv.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {inv.status}
                    </span>
                </td>
                <td className="p-4">{inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
