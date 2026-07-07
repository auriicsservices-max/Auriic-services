import React from 'react';
import { FileText } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const RectecInvoice = ({ candidate, db }: { candidate: any, db: any }) => {
  const saveInvoice = async () => {
    try {
      await addDoc(collection(db, 'invoices'), {
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        position: candidate.position || 'N/A',
        client: candidate.client || 'N/A',
        salary: candidate.salary || 'N/A',
        createdAt: serverTimestamp(),
      });
      console.log('Invoice saved to Firestore');
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const generateInvoice = async () => {
    await saveInvoice();
    const printContent = `
      <html>
        <head>
          <title>Rectec Invoice - ${candidate.fullName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 800; color: #10b981; }
            .details { margin-bottom: 30px; }
            .detail-row { display: flex; margin-bottom: 10px; }
            .label { width: 150px; font-weight: 600; }
            .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Rectec</div>
            <div>
              <h1>Invoice</h1>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div class="details">
            <div class="detail-row"><span class="label">Candidate Name:</span> <span>${candidate.fullName}</span></div>
            <div class="detail-row"><span class="label">Position:</span> <span>${candidate.position || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Client/Company:</span> <span>${candidate.client || 'N/A'}</span></div>
            <div class="detail-row"><span class="label">Salary/Fee:</span> <span>${candidate.salary || 'N/A'}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for using Rectec recruitment services.</p>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  return (
    <button
      onClick={generateInvoice}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-black text-xs uppercase tracking-widest"
    >
      <FileText size={16} />
      Generate Rectec Invoice
    </button>
  );
};
