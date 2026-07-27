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
    setInvoice(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'items') {
        const total = (value as InvoiceItem[]).reduce((sum, item) => sum + (item.amount || 0), 0);
        updated.total = total;
      }
      return updated;
    });
  };

  const updateItem = (id: string, key: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const items = prev.items.map(item => item.id === id ? { ...item, [key]: value } : item);
      const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      return {
        ...prev,
        items,
        total
      };
    });
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', amount: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    setInvoice(prev => {
      const items = prev.items.filter(item => item.id !== id);
      const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      return {
        ...prev,
        items,
        total
      };
    });
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
      alert('Invoice saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 sm:p-8 transition-colors duration-300 font-sans">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 mb-6 text-[var(--text-primary)] font-bold hover:text-[var(--primary-gold)] transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6 bg-[var(--card-bg)] text-[var(--text-primary)] p-6 sm:p-8 rounded-[24px] border border-[var(--border-color)] shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Edit Invoice</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Configure your invoice details and live preview</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Invoice Number</label>
              <input 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all font-mono font-semibold" 
                placeholder="e.g. INV-2026-001" 
                value={invoice.invoiceNumber} 
                onChange={e => updateInvoice('invoiceNumber', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Client Name</label>
              <input 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all font-semibold" 
                placeholder="Client Company Name" 
                value={invoice.clientName} 
                onChange={e => updateInvoice('clientName', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Service Description</label>
              <textarea 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all min-h-[80px]" 
                placeholder="Service details..." 
                value={invoice.serviceDescription} 
                onChange={e => updateInvoice('serviceDescription', e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Payee Name</label>
              <input 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all font-semibold" 
                placeholder="Payee Account Name" 
                value={invoice.payeeName} 
                onChange={e => updateInvoice('payeeName', e.target.value)} 
              />
            </div>

            <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-gold)] mb-1">Bank Payment Instructions</span>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs" 
                  placeholder="Bank Name" 
                  value={invoice.bankName} 
                  onChange={e => updateInvoice('bankName', e.target.value)} 
                />
                <input 
                  className="p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs" 
                  placeholder="Branch" 
                  value={invoice.bankBranch} 
                  onChange={e => updateInvoice('bankBranch', e.target.value)} 
                />
                <input 
                  className="p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs font-mono" 
                  placeholder="Account Number" 
                  value={invoice.accountNumber} 
                  onChange={e => updateInvoice('accountNumber', e.target.value)} 
                />
                <input 
                  className="p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs font-mono" 
                  placeholder="Swift / BIC Code" 
                  value={invoice.swiftCode} 
                  onChange={e => updateInvoice('swiftCode', e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Signatory Name</label>
                <input 
                  className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all font-semibold" 
                  placeholder="Authorized Signatory" 
                  value={invoice.signatoryName} 
                  onChange={e => updateInvoice('signatoryName', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Signatory Title</label>
                <input 
                  className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all" 
                  placeholder="Title (e.g. Director)" 
                  value={invoice.signatoryTitle} 
                  onChange={e => updateInvoice('signatoryTitle', e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Invoice Line Items</span>
              
              {invoice.items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input 
                    className="flex-grow p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-sm" 
                    placeholder="Description" 
                    value={item.description} 
                    onChange={e => updateItem(item.id, 'description', e.target.value)} 
                  />
                  <input 
                    type="number" 
                    className="w-28 p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all font-mono text-sm" 
                    placeholder="Amount (£)" 
                    value={item.amount || ''} 
                    onChange={e => updateItem(item.id, 'amount', parseFloat(e.target.value))} 
                  />
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={addItem} 
                className="flex items-center gap-2 text-[var(--primary-gold)] font-bold text-sm hover:text-[var(--primary-btn-hover)] transition-colors mt-2"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[var(--border-color)]">
            <button 
              onClick={saveInvoice} 
              className="flex-grow py-3.5 bg-gradient-to-r from-[#A98B56] to-[#BC9B66] hover:from-[#BC9B66] hover:to-[#A98B56] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Invoice
            </button>
            <button 
              onClick={generatePDF} 
              className="flex-grow py-3.5 bg-[var(--color-primary-blue)] hover:bg-[var(--color-dark-blue)] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer"
            >
              <FileText size={18} /> Generate PDF
            </button>
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="bg-[var(--bg-secondary)] p-4 sm:p-8 rounded-[24px] border border-[var(--border-color)] shadow-inner max-h-[85vh] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Live Invoice Preview</span>
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">Auto Syncing</span>
          </div>
          <InvoicePreview ref={previewRef} invoice={invoice} logoUrl="" />
        </div>
      </div>
    </div>
  );
};
