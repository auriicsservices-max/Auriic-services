import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Invoice, InvoiceItem } from '../types';
import { InvoicePreview } from './InvoicePreview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Save, FileText, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

export const InvoiceBuilder = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

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
    signatoryName: '',
    signatoryTitle: '',
    status: 'draft',
    invoiceType: 'Custom'
  });

  useEffect(() => {
    const fetchExistingOrCandidate = async () => {
      if (!candidateId) return;
      try {
        // Check if candidateId is actually an existing invoice ID in consolidated_invoices
        const invRef = doc(db, 'consolidated_invoices', candidateId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const invData = invSnap.data();
          setEditingInvoiceId(candidateId);
          setInvoice({
            id: candidateId,
            invoiceNumber: invData.invoiceNumber || '',
            invoiceDate: invData.issueDate || invData.invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: invData.dueDate || '',
            clientName: invData.clientName || '',
            clientAddress: invData.clientAddress || '',
            serviceDescription: invData.notes || invData.paymentTerms || '',
            items: invData.items || [{ id: Date.now().toString(), description: '', amount: 0 }],
            tax: invData.taxRate || 0,
            total: invData.subtotal || invData.totalAmount || 0,
            signatoryName: invData.signatoryName || '',
            signatoryTitle: invData.signatoryTitle || '',
            status: invData.status || 'draft',
            invoiceType: 'Custom'
          });
          return;
        }

        // Otherwise check if it's a candidate ID
        const docRef = doc(db, 'candidates', candidateId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const feeAmount = parseFloat(String(data.salary || '').replace(/[^0-9.]/g, '')) || 5000;
          setInvoice(prev => ({
            ...prev,
            clientName: data.client || '',
            serviceDescription: `Professional Services for ${data.fullName || ''} (${data.position || 'Position'})`,
            items: [{ id: Date.now().toString(), description: `Consulting & Placement Services — ${data.fullName || 'Candidate'}`, amount: feeAmount }],
            total: feeAmount,
            invoiceType: 'Custom'
          }));
        }
      } catch (err) {
        console.error('Error fetching data for invoice builder:', err);
      }
    };
    fetchExistingOrCandidate();
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
      try {
        const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`invoice-${invoice.invoiceNumber || 'statement'}.pdf`);
      } catch (err) {
        console.error('[InvoiceBuilder] PDF generation error:', err);
        alert('Failed to generate PDF. Please try again.');
      }
    }
  };

  const saveInvoice = async () => {
    setLoading(true);
    try {
      const subtotal = invoice.total || 0;
      const taxRate = invoice.tax || 0;
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      const totalAmount = subtotal + taxAmount;

      const invoiceData: any = {
        invoiceNumber: invoice.invoiceNumber || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceType: 'Custom',
        clientName: invoice.clientName || 'Direct Client',
        clientAddress: invoice.clientAddress || '',
        candidates: invoice.items.map(item => ({
          candidateId: item.id,
          candidateName: item.description || 'Custom Item',
          position: 'Custom Service',
          billingType: 'Custom',
          fee: item.amount || 0
        })),
        annualSalary: 0,
        placementFee: subtotal,
        calculatedAmount: subtotal,
        currency: '$',
        taxRate,
        taxAmount,
        discountAmount: 0,
        subtotal,
        totalAmount,
        status: 'Draft',
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        paymentTerms: invoice.serviceDescription || 'Net 30',
        notes: invoice.serviceDescription || '',
        items: invoice.items,
        signatoryName: invoice.signatoryName || '',
        signatoryTitle: invoice.signatoryTitle || '',
        createdBy: user?.email || user?.uid || 'System',
        updatedAt: serverTimestamp(),
      };

      if (editingInvoiceId) {
        await updateDoc(doc(db, 'consolidated_invoices', editingInvoiceId), invoiceData);
        alert('Custom invoice updated successfully!');
      } else {
        invoiceData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'consolidated_invoices'), invoiceData);
        alert('Custom invoice saved successfully and added to Invoice List!');
      }
      navigate('/dashboard', { state: { tab: 'invoices' } });
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
        onClick={() => {
          navigate('/dashboard', { state: { tab: 'invoices' } });
        }} 
        className="flex items-center gap-2 mb-6 text-[var(--text-primary)] font-bold hover:text-[var(--primary-gold)] transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Invoices
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6 bg-[var(--card-bg)] text-[var(--text-primary)] p-6 sm:p-8 rounded-[24px] border border-[var(--border-color)] shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {editingInvoiceId ? 'Edit Custom Invoice' : 'Custom Invoice Builder'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Configure your custom invoice details and live preview</p>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Client Address</label>
              <textarea 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all min-h-[60px]" 
                placeholder="Client billing address..." 
                value={invoice.clientAddress || ''} 
                onChange={e => updateInvoice('clientAddress', e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Invoice Date</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs font-semibold" 
                  value={invoice.invoiceDate} 
                  onChange={e => updateInvoice('invoiceDate', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Due Date</label>
                <input 
                  type="date"
                  className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all text-xs font-semibold" 
                  value={invoice.dueDate} 
                  onChange={e => updateInvoice('dueDate', e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Service Description / Notes</label>
              <textarea 
                className="w-full p-3 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] rounded-xl placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--input-focus-ring)] outline-none transition-all min-h-[80px]" 
                placeholder="Service details or payment terms..." 
                value={invoice.serviceDescription} 
                onChange={e => updateInvoice('serviceDescription', e.target.value)} 
              />
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
              
              {invoice.items.map((item) => (
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
                    placeholder="Amount ($)" 
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
                className="flex items-center gap-2 text-[var(--primary-gold)] font-bold text-sm hover:text-[var(--primary-btn-hover)] transition-colors mt-2 cursor-pointer"
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
