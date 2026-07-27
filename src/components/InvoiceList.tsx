import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, Loader2, Plus, Calendar, User, DollarSign, ArrowLeft, 
  Printer, CheckCircle, Trash2, Check, X, ShieldAlert, Users, ChevronRight, 
  Briefcase, Percent, FileCheck, Layers, Eye, Pencil, Search, CheckSquare, Square
} from 'lucide-react';

interface BilledCandidate {
  candidateId: string;
  candidateName: string;
  position: string;
  billingType: string;
  fee: number;
}

export const InvoiceList = () => {
  const { role, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'builder'>('history');

  // Builder Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [manualClientName, setManualClientName] = useState<string>('');
  // REMOVED: selectedCandidateIds, candidateFees
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [notes, setNotes] = useState<string>('Contract to Hire & Permanent Placement Services combined billing.');

  // Sender info and print overrides
  const [senderName, setSenderName] = useState<string>('');
  const [senderTagline, setSenderTagline] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [senderWeb, setSenderWeb] = useState<string>('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // Modal State for Invoice View
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Edit State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Flat Consolidated/Bulk Fee Option state
  const [useFlatSubtotal, setUseFlatSubtotal] = useState<boolean>(false);
  const [flatSubtotalVal, setFlatSubtotalVal] = useState<number>(0);

  // Global branding state
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Search and Filter States for Invoices
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState<string>('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('all');

  const getCandidateFeeAmount = (c: any) => {
    const salaryNum = parseFloat(String(c.salary || '').replace(/[^0-9.]/g, '')) || 0;
    return salaryNum > 0 ? Math.round(salaryNum * 0.15) : 5000;
  };

  // Load consolidated invoices, candidates, clients and logo
  useEffect(() => {
    // 1. Load Invoices
    const qInvoices = query(collection(db, 'consolidated_invoices'), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoicesData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading consolidated invoices:", error);
      setLoading(false);
    });

    // 2. Load Candidates to group by client
    const qCandidates = query(collection(db, 'candidates'));
    const unsubCandidates = onSnapshot(qCandidates, (snapshot) => {
      const candidatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(candidatesData);
    }, (error) => {
      console.error("Error loading candidates for invoice list:", error);
    });

    // 3. Load Client accounts from users collection
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const clientsList = usersData.filter(u => u.role === 'client');
      setClients(clientsList);
    }, (error) => {
      console.error("Error loading users for client list:", error);
    });

    // 4. Load Global Settings (Branding logo URL)
    const unsubLogo = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setLogoUrl(docSnap.data().logoUrl || '');
      }
    }, (error) => {
      console.error("Error loading global settings logo URL:", error);
    });

    // Generate a default invoice number draft
    const prefix = 'INV-' + new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`${prefix}-${random}`);

    // Set default due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().substring(0, 10));

    return () => {
      unsubInvoices();
      unsubCandidates();
      unsubUsers();
      unsubLogo();
    };
  }, []);

  // Group candidates that belong to the currently selected client
  const activeClientCandidates = candidates.filter(c => {
    if (!selectedClientId) return false;
    return c.clientId === selectedClientId;
  });



  const getClientName = () => {
    if (selectedClientId === 'manual') return manualClientName;
    const clientUser = clients.find(c => c.id === selectedClientId);
    return clientUser ? (clientUser.name || clientUser.email) : 'Direct Client';
  };

  const handleStartEditInvoice = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setSelectedClientId(inv.clientId);
    setManualClientName(inv.clientId === 'manual' ? inv.clientName : '');
    
    // Set candidate selection and fees
    // NOTE: This now auto-populates for client based on the invoice content.
    // In a full refactor, we would validate that all candidates match the client.
    setInvoiceNumber(inv.invoiceNumber || '');
    setDueDate(inv.dueDate || '');
    setTaxRate(inv.taxRate || 0);
    setDiscountAmount(inv.discountAmount || 0);
    setPaymentTerms(inv.paymentTerms || 'Net 30');
    setNotes(inv.notes || '');

    // Set flat billing options if loaded from db
    setUseFlatSubtotal(inv.useFlatSubtotal || false);
    setFlatSubtotalVal(inv.flatSubtotalVal || inv.subtotal || 0);

    // Set branding, sender overrides, and issueDate
    setSenderName(inv.senderName || '');
    setSenderTagline(inv.senderTagline || '');
    setSenderEmail(inv.senderEmail || '');
    setSenderWeb(inv.senderWeb || '');
    setCustomLogoUrl(inv.customLogoUrl || '');
    setIssueDate(inv.issueDate || (inv.createdAt?.toDate ? inv.createdAt.toDate().toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10)));
    
    setActiveTab('builder');
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setSelectedClientId('');
    setManualClientName('');
    
    // Regenerate invoice numbers
    const prefix = 'INV-' + new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`${prefix}-${random}`);

    // Set default due date to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().substring(0, 10));

    setTaxRate(0);
    setDiscountAmount(0);
    setPaymentTerms('Net 30');
    setNotes('Contract to Hire & Permanent Placement Services combined billing.');

    // Reset flat billing overrides
    setUseFlatSubtotal(false);
    setFlatSubtotalVal(0);

    // Reset sender and brand overrides
    setSenderName('');
    setSenderTagline('');
    setSenderEmail('');
    setSenderWeb('');
    setCustomLogoUrl('');
    setIssueDate(new Date().toISOString().substring(0, 10));
    
    setActiveTab('history');
  };

  // Generate / Update Invoice Action
  const handleGenerateBulkInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      alert('Please select a client/company');
      return;
    }
    if (selectedClientId === 'manual' && !manualClientName.trim()) {
      alert('Please enter a custom client company name');
      return;
    }

    const selectedCandidatesList = activeClientCandidates
      .map(c => ({
        candidateId: c.id,
        candidateName: c.fullName,
        position: c.position || 'Consultant',
        billingType: 'Contract to Hire (Monthly)',
        fee: getCandidateFeeAmount(c)
      }));

    const subtotal = useFlatSubtotal
      ? flatSubtotalVal
      : selectedCandidatesList.reduce((sum, item) => sum + item.fee, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const totalAmount = subtotal + taxAmount - discountAmount;

    try {
      if (editingInvoiceId) {
        // Edit mode - Update existing invoice
        const updatedInvoice = {
          invoiceNumber: invoiceNumber.trim() || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          clientId: selectedClientId === 'manual' ? 'manual' : selectedClientId,
          clientName: getClientName(),
          candidates: selectedCandidatesList,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          totalAmount,
          dueDate,
          paymentTerms,
          notes,
          senderName,
          senderTagline,
          senderEmail,
          senderWeb,
          customLogoUrl,
          issueDate,
          useFlatSubtotal,
          flatSubtotalVal,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'System'
        };
        
        await updateDoc(doc(db, 'consolidated_invoices', editingInvoiceId), updatedInvoice);
        alert('Combined/Bulk Invoice updated successfully!');
      } else {
        // Create mode
        const newInvoice = {
          invoiceNumber: invoiceNumber.trim() || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          clientId: selectedClientId === 'manual' ? 'manual' : selectedClientId,
          clientName: getClientName(),
          candidates: selectedCandidatesList,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          totalAmount,
          status: 'Draft',
          dueDate,
          paymentTerms,
          notes,
          senderName,
          senderTagline,
          senderEmail,
          senderWeb,
          customLogoUrl,
          issueDate,
          useFlatSubtotal,
          flatSubtotalVal,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || 'System'
        };

        await addDoc(collection(db, 'consolidated_invoices'), newInvoice);
        alert('Combined/Bulk Invoice generated successfully!');
      }
      
      // Reset form states
      setEditingInvoiceId(null);
      setSelectedClientId('');
      setManualClientName('');
      setTaxRate(0);
      setDiscountAmount(0);
      setPaymentTerms('Net 30');
      setNotes('Contract to Hire & Permanent Placement Services combined billing.');
      
      // Reset flat billing overrides
      setUseFlatSubtotal(false);
      setFlatSubtotalVal(0);

      // Reset brand/sender overrides
      setSenderName('');
      setSenderTagline('');
      setSenderEmail('');
      setSenderWeb('');
      setCustomLogoUrl('');
      setIssueDate(new Date().toISOString().substring(0, 10));
      
      // Regenerate invoice numbers
      const prefix = 'INV-' + new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`${prefix}-${random}`);

      // Set default due date to 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().substring(0, 10));

      // Switch tab
      setActiveTab('history');
    } catch (err) {
      console.error('Error generating/updating consolidated invoice:', err);
      alert('Failed to save combined invoice: ' + (err as Error).message);
    }
  };

  // Update Status of generated Invoice
  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'consolidated_invoices', invoiceId), { status: newStatus });
      setViewingInvoice((prev: any) => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update invoice status');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'consolidated_invoices', invoiceId));
      setViewingInvoice(null);
      alert('Invoice deleted successfully');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      alert('Failed to delete invoice');
    }
  };

  // Open printable window for Invoice
  const handlePrintInvoice = (inv: any) => {
    const candidateRows = inv.candidates.map((c: any, index: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; font-weight: 600;">${c.candidateName}</td>
        <td style="padding: 8px;">${c.position}</td>
        <td style="padding: 8px;"><span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${c.billingType}</span></td>
        <td style="padding: 8px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600;">${Number(c.fee) > 0 ? `$${Number(c.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '<span style="color: #64748b; font-size: 10px; font-weight: normal;">Included</span>'}</td>
      </tr>
    `).join('');

    const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : (inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
    const formattedDueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A';
    const activeLogoUrl = inv.customLogoUrl || '';
    const activeSenderName = inv.senderName || '';
    const activeSenderTagline = inv.senderTagline || '';
    const activeSenderEmail = inv.senderEmail || '';
    const activeSenderWeb = inv.senderWeb || '';

    const printContent = `
      <html>
        <head>
          <title>Invoice - ${inv.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; line-height: 1.4; background: #fff; font-size: 12px; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px; }
            .company-details h1 { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0 0 4px 0; letter-spacing: -0.025em; }
            .company-details p { margin: 2px 0; color: #64748b; font-size: 12px; }
            .invoice-title-block { text-align: right; }
            .invoice-title-block h2 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
            .meta-section h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; letter-spacing: 0.05em; }
            .meta-section p { margin: 3px 0; font-size: 13px; }
            .meta-section strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; padding: 8px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            tr { page-break-inside: avoid; }
            .summary-container { display: flex; justify-content: flex-end; margin-top: 15px; page-break-inside: avoid; }
            .summary-table { width: 300px; font-size: 13px; }
            .summary-table tr { border-bottom: 1px solid #f1f5f9; }
            .summary-table td { padding: 6px 0; }
            .summary-table .total-row { border-top: 2px solid #4f46e5; font-size: 16px; font-weight: 800; color: #4f46e5; }
            .notes-block { margin-top: 25px; padding: 12px; background-color: #f8fafc; border-radius: 8px; font-size: 12px; page-break-inside: avoid; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; page-break-inside: avoid; }
            .stamp { display: inline-block; padding: 4px 8px; border: 2px solid; border-radius: 6px; font-weight: 800; text-transform: uppercase; transform: rotate(-5deg); font-size: 12px; }
            .stamp-Paid { border-color: #10b981; color: #10b981; }
            .stamp-Sent { border-color: #3b82f6; color: #3b82f6; }
            .stamp-Draft { border-color: #eab308; color: #eab308; }
            .stamp-Overdue { border-color: #ef4444; color: #ef4444; }

            @page {
              size: auto;
              margin: 10mm 15mm;
            }
            @media print {
              body {
                padding: 0 !important;
                margin: 0 !important;
                font-size: 11px !important;
                line-height: 1.3 !important;
              }
              .header-container {
                padding-bottom: 8px !important;
                margin-bottom: 12px !important;
              }
              .company-details h1 {
                font-size: 18px !important;
              }
              .company-details p {
                font-size: 10px !important;
              }
              .invoice-title-block h2 {
                font-size: 20px !important;
              }
              .stamp {
                padding: 2px 6px !important;
                font-size: 10px !important;
              }
              .meta-grid {
                margin-bottom: 12px !important;
                gap: 15px !important;
              }
              .meta-section h3 {
                font-size: 11px !important;
                margin-bottom: 4px !important;
                padding-bottom: 2px !important;
              }
              .meta-section p {
                font-size: 10px !important;
              }
              table {
                margin-bottom: 12px !important;
                font-size: 10px !important;
              }
              th {
                padding: 5px 6px !important;
                font-size: 9px !important;
              }
              td {
                padding: 5px 6px !important;
              }
              .summary-container {
                margin-top: 8px !important;
              }
              .summary-table {
                width: 230px !important;
                font-size: 10px !important;
              }
              .summary-table td {
                padding: 3px 0 !important;
              }
              .summary-table .total-row {
                font-size: 13px !important;
              }
              .notes-block {
                margin-top: 15px !important;
                padding: 8px !important;
                font-size: 10px !important;
              }
              .footer {
                margin-top: 20px !important;
                padding-top: 8px !important;
                font-size: 9px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-container" style="${(!activeLogoUrl && !activeSenderName && !activeSenderTagline && !activeSenderEmail && !activeSenderWeb) ? 'border-bottom: none; padding-bottom: 0; margin-bottom: 20px;' : ''}">
            ${(activeLogoUrl || activeSenderName || activeSenderTagline || activeSenderEmail || activeSenderWeb) ? `
            <div class="company-details" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
              ${activeLogoUrl ? `<img src="${activeLogoUrl}" alt="Logo" style="max-height: 45px; max-width: 150px; object-fit: contain; margin-bottom: 4px;" referrerPolicy="no-referrer" />` : ''}
              <div style="display: flex; flex-direction: column; gap: 2px;">
                ${activeSenderName ? `<h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #4f46e5;">${activeSenderName}</h1>` : ''}
                ${activeSenderTagline ? `<p style="margin: 1px 0; color: #64748b; font-size: 12px;">${activeSenderTagline}</p>` : ''}
                ${(activeSenderEmail || activeSenderWeb) ? `
                  <p style="margin: 1px 0; color: #64748b; font-size: 12px;">
                    ${activeSenderEmail ? `Email: ${activeSenderEmail}` : ''}
                    ${(activeSenderEmail && activeSenderWeb) ? ' | ' : ''}
                    ${activeSenderWeb ? `Web: ${activeSenderWeb}` : ''}
                  </p>
                ` : ''}
              </div>
            </div>
            ` : '<div style="flex: 1;"></div>'}
            <div class="invoice-title-block">
              <h2>INVOICE</h2>
              <div class="stamp stamp-${inv.status}">${inv.status}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-section">
              <h3>Billed To</h3>
              <p><strong>Client:</strong> ${inv.clientName}</p>
              <p><strong>Payment Terms:</strong> ${inv.paymentTerms || 'Net 30'}</p>
            </div>
            <div class="meta-section" style="text-align: right;">
              <h3>Invoice Info</h3>
              <p><strong>Invoice Number:</strong> ${inv.invoiceNumber}</p>
              <p><strong>Issue Date:</strong> ${formattedDate}</p>
              <p><strong>Due Date:</strong> ${formattedDueDate}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th>Placed Candidate</th>
                <th>Position/Role</th>
                <th>Placement/Contract Type</th>
                <th style="text-align: right; width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${candidateRows}
            </tbody>
          </table>

          <div class="summary-container">
            <table class="summary-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">$${Number(inv.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              ${inv.taxRate > 0 ? `
              <tr>
                <td>Tax (${inv.taxRate}%):</td>
                <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">+$${Number(inv.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${inv.discountAmount > 0 ? `
              <tr>
                <td>Discount:</td>
                <td style="text-align: right; font-family: 'JetBrains Mono', monospace; color: #ef4444;">-$${Number(inv.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td>Total Due:</td>
                <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">$${Number(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="notes-block">
            <strong style="display: block; margin-bottom: 4px; color: #1e293b;">Notes / Terms:</strong>
            <p style="margin: 0; color: #475569;">${inv.notes || 'N/A'}</p>
          </div>

          <div class="footer">
            <p>Thank you for partnering with Aurrum Company Recruitment Services.</p>
            ${activeSenderEmail ? `<p>If you have any questions regarding this consolidated statement, contact us at ${activeSenderEmail}</p>` : ''}
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      // small delay to let styles render before print trigger
      setTimeout(() => {
        win.print();
      }, 500);
    }
  };

  // Filtered invoices for the History Tab
  const filteredInvoices = invoices.filter(inv => {
    if (filterInvoiceStatus !== 'all' && inv.status !== filterInvoiceStatus) {
      return false;
    }
    if (searchInvoiceQuery.trim()) {
      const q = searchInvoiceQuery.toLowerCase();
      const numMatch = (inv.invoiceNumber || '').toLowerCase().includes(q);
      const clientMatch = (inv.clientName || '').toLowerCase().includes(q);
      const candMatch = inv.candidates && Array.isArray(inv.candidates)
        ? inv.candidates.some((c: any) => (c.candidateName || '').toLowerCase().includes(q))
        : false;
      return numMatch || clientMatch || candMatch;
    }
    return true;
  });

  // Filtered candidates list for the Builder Tab
  const filteredCandidateList = activeClientCandidates;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Invoicing Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto space-y-6">
      {/* Header with quick statistics and active tab triggers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 crm-card p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-[var(--bg-secondary)] rounded-xl text-[var(--primary-gold)] border border-[var(--border-color)]">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Combined & Bulk Candidate Billing</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Generate and manage consolidated bills for contract-to-hire, bulk hires, and placement agreements.
          </p>
        </div>

        <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all duration-300 ${
              activeTab === 'history'
                ? 'crm-btn-gold text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoice History ({invoices.length})
          </button>
          
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all duration-300 ${
              activeTab === 'builder'
                ? 'crm-btn-gold text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {editingInvoiceId ? (
              <>
                <Pencil className="w-4 h-4 text-[var(--primary-gold)]" />
                Edit Combined Bill
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Combined Bill
              </>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="crm-card p-0 overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-primary)]">
            <div>
              <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">All Consolidated Invoices</span>
              <p className="text-xs text-[var(--text-primary)] mt-0.5">Filter, search, print, or manage billing statements.</p>
            </div>
            <span className="crm-badge-gold text-xs px-3.5 py-1.5">
              Total Statement Amount: ${invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {invoices.length > 0 && (
            <div className="p-4 bg-[var(--card-bg)] border-b border-[var(--border-color)] flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <span className="absolute left-3.5 top-2.5 text-[var(--text-muted)]">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search by invoice #, client name, or candidate..."
                  value={searchInvoiceQuery}
                  onChange={(e) => setSearchInvoiceQuery(e.target.value)}
                  className="crm-input pl-9 pr-8"
                />
                {searchInvoiceQuery && (
                  <button 
                    onClick={() => setSearchInvoiceQuery('')}
                    className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {['all', 'Draft', 'Sent', 'Paid', 'Overdue'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterInvoiceStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 cursor-pointer ${
                      filterInvoiceStatus === status
                        ? 'crm-btn-gold text-white shadow-sm'
                        : 'crm-btn-secondary text-xs'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center font-sans">
              <div className="w-16 h-16 bg-[var(--bg-primary)] rounded-3xl flex items-center justify-center text-[var(--primary-gold)] mb-4 border border-[var(--border-color)]">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-lg">No consolidated invoices yet</h3>
              <p className="text-sm text-[var(--text-primary)] mt-1 max-w-sm">
                Create your first combined bill for a company's hired candidates, contract-to-hire, or permanent placement contract.
              </p>
              <button
                onClick={() => setActiveTab('builder')}
                className="mt-6 crm-btn-gold"
              >
                <Plus className="w-4 h-4" /> Build Combined Invoice
              </button>
            </div>
          ) : (
            <div className="crm-table-container border-0 rounded-none">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th className="pl-6">Invoice #</th>
                    <th>Client / Company</th>
                    <th>Candidates</th>
                    <th>Total Amount</th>
                    <th>Due Date</th>
                    <th className="text-center">Status</th>
                    <th className="pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-[var(--text-primary)] font-sans">
                        <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                        <p className="text-sm font-bold">No invoices match your search query or status filter.</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Try resetting the invoice search or choosing a different status filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--card-hover-bg)] transition-colors">
                      <td className="p-4 pl-6">
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{inv.invoiceNumber}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[var(--text-primary)] text-xs">{inv.clientName}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{inv.paymentTerms || 'Net 30'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="text-xs font-extrabold text-[var(--primary-gold)]">{inv.candidates?.length || 0} Placements</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[200px]">
                          {inv.candidates?.map((c: any) => c.candidateName).join(', ')}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs font-black text-[var(--text-primary)]">
                          ${inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={
                          inv.status === 'Paid' ? 'crm-badge-success text-[10px] uppercase' :
                          inv.status === 'Sent' ? 'crm-badge-info text-[10px] uppercase' :
                          inv.status === 'Overdue' ? 'crm-badge-error text-[10px] uppercase' :
                          'crm-badge-warning text-[10px] uppercase'
                        }>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                            title="View statement & print"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handlePrintInvoice(inv)}
                            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--primary-gold)] transition"
                            title="Direct print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {(role === 'admin' || role === 'developer' || role === 'team_leader') && (
                            <>
                              <button
                                onClick={() => handleStartEditInvoice(inv)}
                                className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-amber-500 transition"
                                title="Edit bill details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-rose-500 transition"
                                title="Delete bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleGenerateBulkInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {editingInvoiceId && (
            <div className="lg:col-span-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-wide">Edit Invoice Mode Active</h4>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    You are editing Invoice number <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">{invoiceNumber}</span>. Saving will update this invoice instead of creating a new one.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shrink-0 self-end sm:self-auto"
              >
                Cancel Edit Mode
              </button>
            </div>
          )}

          {/* Builder Step 1 & 2: Client & Candidate Selection */}
          <div className="lg:col-span-2 crm-card p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-4">
              <Users className="w-5 h-5 text-[var(--primary-gold)]" />
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Select Client & Candidates</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Choose which company to bill and select the candidates placed or working.</p>
              </div>
            </div>

            {/* Client Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Client Company / Account</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    }}
                  className="crm-input w-full py-2.5"
                >
                  <option value="">-- Choose a Registered Client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name || client.email}</option>
                  ))}
                  <option value="manual">Custom Client (Non-system account)</option>
                </select>

                {selectedClientId === 'manual' && (
                  <input
                    type="text"
                    placeholder="Enter Custom Client Company Name (e.g. Aurrum Company)"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    className="crm-input w-full py-2.5"
                  />
                )}
              </div>
            </div>

            {/* Placed Candidates Checklist */}
            {selectedClientId ? (
              <div className="space-y-4">
                {/* Billing Model Selector */}
                <div className="crm-card bg-[var(--bg-secondary)] p-5 border border-[var(--border-color)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Billing Model</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Automated client-wise consolidated billing.</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider font-mono">Consolidated Flat Placement Fee ($)</label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-2.5 text-xs text-[var(--text-secondary)]">$</span>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={flatSubtotalVal || ''}
                        onChange={(e) => setFlatSubtotalVal(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="crm-input pl-7 pr-3 py-2.5 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider">
                    Candidates To Be Billed ({activeClientCandidates.length})
                  </label>
                </div>

                <div className="space-y-3">
                  {activeClientCandidates.length === 0 ? (
                    <div className="p-8 border border-dashed border-[var(--border-color)] rounded-3xl text-center font-sans">
                      <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-secondary)]">No candidates are currently assigned to this Client account.</p>
                    </div>
                  ) : (
                    activeClientCandidates.map(c => {
                      return (
                        <div 
                          key={c.id} 
                          className="p-5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl"
                        >
                          <div className="flex justify-between items-center w-full">
                            <div className="text-xs font-black text-[var(--text-primary)]">
                              {c.fullName}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">
                              {c.position || 'Consultant'}
                            </div>
                            <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                                ${getCandidateFeeAmount(c).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-muted)]">Choose a client company above to load the eligible candidates for bulk billing.</p>
              </div>
            )}
          </div>

          {/* Builder Step 3: Billing Info, Invoice Meta & Calculations */}
          <div className="space-y-6">
            <div className="crm-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                <FileText className="w-4.5 h-4.5 text-[var(--primary-gold)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-xs">Billing Details</h3>
              </div>

              {/* Invoice Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Invoice # (Editable)</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="crm-input w-full py-2 font-mono"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Terms */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="crm-input w-full py-2"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Notes & Special Terms</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="crm-input w-full py-2 resize-none"
                  placeholder="Billing terms, bank detail info..."
                />
              </div>
            </div>

            {/* Brand, Logo & Sender Customization Overrides */}
            <div className="crm-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                <Layers className="w-4.5 h-4.5 text-[var(--primary-gold)]" />
                <h3 className="font-bold text-[var(--text-primary)] text-xs">Print Brand & Sender Info</h3>
              </div>

              {/* Custom Issue Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Invoice Issue Date</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Sender Company Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Sender Company Name Override</label>
                <input
                  type="text"
                  placeholder="e.g. AURRUM RECRUITMENT"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Tagline */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Tagline / Subtitle Override</label>
                <input
                  type="text"
                  placeholder="e.g. Core Contract-to-Hire & Bulk Placements"
                  value={senderTagline}
                  onChange={(e) => setSenderTagline(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Sender Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Contact Email Override</label>
                <input
                  type="email"
                  placeholder="info@aurrum.co"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Sender Web */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Website URL Override</label>
                <input
                  type="text"
                  placeholder="aurrum.co"
                  value={senderWeb}
                  onChange={(e) => setSenderWeb(e.target.value)}
                  className="crm-input w-full py-2"
                />
              </div>

              {/* Custom Logo URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Custom Logo URL Override</label>
                <input
                  type="text"
                  placeholder="e.g. https://example.com/logo.png"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="crm-input w-full py-2"
                />
                {customLogoUrl && (
                  <div className="mt-2 p-3 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center border border-[var(--border-color)]">
                    <img src={customLogoUrl} alt="Logo preview" className="max-h-12 object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Summary Card */}
            <div className="crm-card p-6 space-y-4">
              <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Subtotal Summary</h4>

              <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Candidates Count:</span>
                  <span className="font-bold text-[var(--text-primary)]">{activeClientCandidates.length}</span>
                </div>

                <div className="flex justify-between">
                  <span>Placements Subtotal:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    ${(useFlatSubtotal ? flatSubtotalVal : activeClientCandidates
                      .reduce((sum, item) => sum + getCandidateFeeAmount(item), 0))
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Tax Rate */}
                <div className="flex items-center justify-between py-2 border-y border-[var(--border-color)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <Percent className="w-3.5 h-3.5" /> Tax Rate (%):
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-center crm-input font-mono font-bold"
                  />
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-color)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <DollarSign className="w-3.5 h-3.5" /> Discount ($):
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-24 px-2 py-1 text-right crm-input font-mono font-bold"
                  />
                </div>

                {/* Total */}
                <div className="flex justify-between pt-3 text-sm font-black text-[var(--text-primary)]">
                  <span>GRAND TOTAL DUE:</span>
                  <span className="font-mono text-[var(--primary-gold)]">
                    ${(() => {
                      const subtotal = useFlatSubtotal ? flatSubtotalVal : activeClientCandidates
                        .reduce((sum, item) => sum + getCandidateFeeAmount(item), 0);
                      const taxVal = Math.round(subtotal * (taxRate / 100));
                      const finalTotal = subtotal + taxVal - discountAmount;
                      return Math.max(0, finalTotal).toLocaleString(undefined, { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="crm-btn-gold w-full flex items-center justify-center gap-2 text-xs py-3.5"
              >
                <FileCheck className="w-4 h-4" /> {editingInvoiceId ? 'Update Combined Bill' : 'Save & Generate Combined Bill'}
              </button>

              {editingInvoiceId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="crm-btn-secondary w-full mt-2 flex items-center justify-center gap-2 text-xs py-3"
                >
                  <X className="w-4 h-4" /> Cancel Edit Mode
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Invoice Detail Modal / Statement View */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[24px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Actions Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <FileText className="w-4.5 h-4.5 text-[var(--primary-gold)]" />
                <span className="font-mono text-xs font-bold uppercase tracking-tight">Invoice Details ({viewingInvoice.invoiceNumber})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintInvoice(viewingInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 crm-btn-gold text-xs font-bold transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Statement details */}
            <div className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[var(--border-color)]">
                <div className="flex flex-col items-start gap-3">
                  {viewingInvoice.customLogoUrl ? (
                    <img 
                      src={viewingInvoice.customLogoUrl} 
                      alt="Company Logo" 
                      className="max-h-12 max-w-[150px] object-contain rounded-lg bg-[var(--card-bg)] p-1 border border-[var(--border-color)]" 
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <div>
                    {viewingInvoice.senderName && (
                      <h3 className="text-xl font-black text-[var(--primary-gold)] tracking-tight">{viewingInvoice.senderName}</h3>
                    )}
                    {viewingInvoice.senderTagline && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{viewingInvoice.senderTagline}</p>
                    )}
                    {(viewingInvoice.senderEmail || viewingInvoice.senderWeb) && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {viewingInvoice.senderEmail && <span>{viewingInvoice.senderEmail}</span>}
                        {viewingInvoice.senderEmail && viewingInvoice.senderWeb && <span className="mx-1.5">|</span>}
                        {viewingInvoice.senderWeb && <span>{viewingInvoice.senderWeb}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Statement of Account</div>
                  <div className="text-lg font-mono font-black text-[var(--text-primary)] mt-0.5">{viewingInvoice.invoiceNumber}</div>
                  <div className="mt-2">
                    <span className={
                      viewingInvoice.status === 'Paid' ? 'crm-badge-success text-[10px] uppercase' :
                      viewingInvoice.status === 'Sent' ? 'crm-badge-info text-[10px] uppercase' :
                      viewingInvoice.status === 'Overdue' ? 'crm-badge-error text-[10px] uppercase' :
                      'crm-badge-warning text-[10px] uppercase'
                    }>
                      {viewingInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metagrid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px]">Bill To Client</div>
                  <div className="text-sm font-black text-[var(--text-primary)]">{viewingInvoice.clientName}</div>
                  <div className="text-[var(--text-secondary)]">Contract Agreement: {viewingInvoice.paymentTerms || 'Net 30'}</div>
                </div>
                <div className="sm:text-right space-y-1">
                  <div className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px]">Invoice Details</div>
                  <div className="text-[var(--text-primary)]"><strong>Issue Date:</strong> {viewingInvoice.issueDate ? new Date(viewingInvoice.issueDate + 'T12:00:00').toLocaleDateString() : (viewingInvoice.createdAt?.toDate ? viewingInvoice.createdAt.toDate().toLocaleDateString() : 'N/A')}</div>
                  <div className="text-[var(--text-primary)]"><strong>Due Date:</strong> {viewingInvoice.dueDate ? new Date(viewingInvoice.dueDate + 'T12:00:00').toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              {/* Billed Candidates Table */}
              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-secondary)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    <tr>
                      <th className="p-3 pl-4">#</th>
                      <th className="p-3">Placed Candidate</th>
                      <th className="p-3">Role / Specialty</th>
                      <th className="p-3">Billing Contract Type</th>
                      <th className="p-3 pr-4 text-right">Fee/Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-xs">
                    {viewingInvoice.candidates?.map((c: any, index: number) => (
                      <tr key={c.candidateId || index} className="text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]">
                        <td className="p-3 pl-4 font-mono text-[var(--text-muted)]">{index + 1}</td>
                        <td className="p-3 font-semibold text-[var(--text-primary)]">{c.candidateName}</td>
                        <td className="p-3">{c.position}</td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[10px] border border-[var(--border-color)]">
                            {c.billingType}
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-[var(--text-primary)]">
                          {Number(c.fee || 0) > 0 ? `$${Number(c.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (
                            <span className="text-xs font-normal text-[var(--text-muted)]">Included</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-[var(--text-primary)]">${Number(viewingInvoice.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {viewingInvoice.taxRate > 0 && (
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Tax ({viewingInvoice.taxRate}%):</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">+$${Number(viewingInvoice.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {viewingInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Discount Amount:</span>
                      <span className="font-mono font-semibold text-rose-500">-${Number(viewingInvoice.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-[var(--border-color)] pt-2 text-[var(--text-primary)]">
                    <span>Total statement due:</span>
                    <span className="font-mono text-[var(--primary-gold)]">${Number(viewingInvoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Notes Field */}
              <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">Contract / Terms Notes:</div>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed margin-0">{viewingInvoice.notes || 'No special terms stated.'}</p>
              </div>

              {/* Admin Actions Status controls */}
              {(role === 'admin' || role === 'developer' || role === 'team_leader') && (
                <div className="pt-6 border-t border-[var(--border-color)] flex flex-wrap gap-2 items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Update Settlement Status</div>
                  <div className="flex gap-1">
                    {['Draft', 'Sent', 'Paid', 'Overdue'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(viewingInvoice.id, status)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          viewingInvoice.status === status
                            ? 'crm-btn-gold text-white shadow-sm'
                            : 'crm-btn-secondary text-[10px]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

