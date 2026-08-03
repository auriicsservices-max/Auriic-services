import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Loader2 } from 'lucide-react';

export const ClientInvoiceGenerator = ({ clientId, clientName, candidates }: { clientId: string, clientName: string, candidates: any[] }) => {
  const [loading, setLoading] = useState(false);

  const generateInvoice = async () => {
    setLoading(true);
    try {
      const invoiceData = {
        clientId,
        clientName,
        candidates: candidates.map(c => ({
          candidateId: c.id,
          candidateName: c.fullName,
          position: c.position || 'N/A',
          fee: c.fee || 0,
        })),
        totalAmount: candidates.reduce((sum, c) => sum + (c.fee || 0), 0),
        status: 'Draft',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'consolidated_invoices'), invoiceData);
      
      // Print/PDF generation logic would go here
      alert('Dynamic invoice generated!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generateInvoice}
      disabled={loading}
      className="crm-btn-gold flex items-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50"
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
      Generate Dynamic Invoice
    </button>
  );
};
