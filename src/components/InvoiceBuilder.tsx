import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, InvoiceItem } from '../types';
import { InvoicePreview } from './InvoicePreview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Save, FileText, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

export const InvoiceBuilder = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice>({
    id: Date.now().toString(),
      invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    clientName: '',
    clientAddress: '',
    serviceDescription: '',
    items: [{ id: Date.now().toString(), description: '', amount: 0 }],
    tax: 0,
    total: 0,
    payeeName: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    swiftCode: '',
    signatoryName: '',
    signatoryTitle: '',
    status: 'draft',
    candidateId: candidateId
  });

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!candidateId) return;
      const docRef = doc(db, 'candidates', candidateId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInvoice(prev => ({
          ...prev,
          clientName: data.client || '',
          serviceDescription: `Placement Fee for ${data.fullName || ''}`,
        }));
      }
    };
    fetchCandidate();
  }, [candidateId]);

  const updateInvoice = (key: keyof Invoice, value: any) => {
    setInvoice(prev => ({ ...prev, [key]: value }));
  };

  const updateItem = (id: string, key: keyof InvoiceItem, value: any) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [key]: value } : item)
    }));
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', amount: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const generatePDF = async () => {
    if (previewRef.current) {
      const canvas = await html2canvas(previewRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    }
  };

  const saveInvoice = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'invoices'), { ...invoice, createdAt: serverTimestamp() });
      alert('Invoice saved!');
    } catch (error) {
      console.error(error);
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-[#004564] font-bold"><ArrowLeft size={16} /> Back</button>
      <div className="grid grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-serif font-bold text-[#004564]">Edit Invoice</h2>
          <input className="w-full p-2 border border-[#A98B56] rounded" placeholder="Invoice Number" value={invoice.invoiceNumber} onChange={e => updateInvoice('invoiceNumber', e.target.value)} />
          <input className="w-full p-2 border border-[#A98B56] rounded" placeholder="Client Name" value={invoice.clientName} onChange={e => updateInvoice('clientName', e.target.value)} />
          <textarea className="w-full p-2 border border-[#A98B56] rounded" placeholder="Service Description" value={invoice.serviceDescription} onChange={e => updateInvoice('serviceDescription', e.target.value)} />
          
          <input className="w-full p-2 border border-[#A98B56] rounded" placeholder="Payee Name" value={invoice.payeeName} onChange={e => updateInvoice('payeeName', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="p-2 border border-[#A98B56] rounded" placeholder="Bank Name" value={invoice.bankName} onChange={e => updateInvoice('bankName', e.target.value)} />
            <input className="p-2 border border-[#A98B56] rounded" placeholder="Branch" value={invoice.bankBranch} onChange={e => updateInvoice('bankBranch', e.target.value)} />
            <input className="p-2 border border-[#A98B56] rounded" placeholder="Account Number" value={invoice.accountNumber} onChange={e => updateInvoice('accountNumber', e.target.value)} />
            <input className="p-2 border border-[#A98B56] rounded" placeholder="Swift Code" value={invoice.swiftCode} onChange={e => updateInvoice('swiftCode', e.target.value)} />
          </div>
          <input className="w-full p-2 border border-[#A98B56] rounded" placeholder="Signatory Name" value={invoice.signatoryName} onChange={e => updateInvoice('signatoryName', e.target.value)} />
          <input className="w-full p-2 border border-[#A98B56] rounded" placeholder="Signatory Title" value={invoice.signatoryTitle} onChange={e => updateInvoice('signatoryTitle', e.target.value)} />

          {invoice.items.map(item => (
            <div key={item.id} className="flex gap-2">
              <input className="flex-grow p-2 border border-[#A98B56] rounded" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
              <input type="number" className="w-24 p-2 border border-[#A98B56] rounded" placeholder="Amount" value={item.amount} onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))} />
              <button onClick={() => removeItem(item.id)}><Trash2 className="text-red-500" /></button>
            </div>
          ))}
          <button onClick={addItem} className="flex items-center gap-2 text-[#A98B56] font-bold"><Plus size={16} /> Add Item</button>
          
          <div className="flex gap-2">
            <button onClick={saveInvoice} className="flex-grow py-3 bg-[#A98B56] text-white rounded font-bold hover:bg-[#8e7548] flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Invoice
            </button>
            <button onClick={generatePDF} className="flex-grow py-3 bg-[#004564] text-white rounded font-bold hover:bg-[#003046] flex items-center justify-center gap-2">
              <FileText size={16} /> Generate PDF
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-slate-200 p-8 rounded-lg">
          <InvoicePreview ref={previewRef} invoice={invoice} logoUrl="https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg" />
        </div>
      </div>
    </div>
  );
};
