import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, Loader2, Plus, Calendar, User, DollarSign, ArrowLeft, 
  Printer, CheckCircle, Trash2, Check, X, ShieldAlert, Users, ChevronRight, 
  Briefcase, Percent, FileCheck, Layers, Eye, Pencil, Search, CheckSquare, Square,
  Download, Mail
} from 'lucide-react';

interface BilledCandidate {
  candidateId: string;
  candidateName: string;
  position: string;
  billingType: string;
  fee: number;
}

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Invoice View & Editable Preview
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [editedInvoice, setEditedInvoice] = useState<any | null>(null);
  const [editStatusMessage, setEditStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenInvoice = (inv: any) => {
    setViewingInvoice(inv);
    const cloned = JSON.parse(JSON.stringify(inv));
    if (!cloned.serviceDescription) {
      cloned.serviceDescription = 'Placement Fee - Recruitment Services';
    }
    if (cloned.subtotal === undefined && cloned.candidates && cloned.candidates.length > 0) {
      cloned.subtotal = cloned.candidates.reduce((sum: number, c: any) => sum + Number(c.fee || c.amount || 0), 0);
    }
    if (cloned.calcCtc === undefined) {
      cloned.calcCtc = cloned.subtotal ? Math.round(cloned.subtotal / (cloned.calcFeePercent || 15) * 100) : 60000;
    }
    if (cloned.calcFeePercent === undefined) {
      cloned.calcFeePercent = 15;
    }
    setEditedInvoice(cloned);
    setEditStatusMessage(null);
  };

  const handleSaveEditedInvoice = async () => {
    if (!editedInvoice || !editedInvoice.id) return;
    setEditStatusMessage(null);
    try {
      const subtotal = Number(editedInvoice.subtotal || 0);
      const taxRate = Number(editedInvoice.taxRate || 0);
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      const discountAmount = Number(editedInvoice.discountAmount || 0);
      const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

      const updatedPayload = {
        ...editedInvoice,
        subtotal,
        taxAmount,
        totalAmount,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'consolidated_invoices', editedInvoice.id), updatedPayload);
      setViewingInvoice(updatedPayload);
      setEditedInvoice(JSON.parse(JSON.stringify(updatedPayload)));
      setEditStatusMessage({ type: 'success', text: 'Invoice edits saved successfully!' });
      setTimeout(() => setEditStatusMessage(null), 3500);
    } catch (err) {
      console.error('Error saving invoice edits:', err);
      setEditStatusMessage({ type: 'error', text: 'Failed to save invoice edits. Please try again.' });
    }
  };

  // Search and Filter States for Invoices
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState<string>('');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('all');

  // Load consolidated invoices
  useEffect(() => {
    const qInvoices = query(collection(db, 'consolidated_invoices'), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(invoicesData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading consolidated invoices:", error);
      setLoading(false);
    });

    return () => {
      unsubInvoices();
    };
  }, []);

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

  const handleDownloadPDF = async (inv: any) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.fontFamily = "'Poppins', sans-serif";
      container.style.color = '#002D38';

      const isFlatInvoice = inv.useFlatSubtotal || (inv.subtotal && (!inv.candidates || inv.candidates.length === 0));
      const candidateRows = isFlatInvoice ? `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; text-align: center;">1</td>
          <td style="padding: 12px; font-weight: 600;" colspan="3">Placement Fee</td>
          <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 600;">$${Number(inv.subtotal || inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      ` : (inv.candidates || []).map((c: any, index: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; font-weight: 600;">${c.candidateName}</td>
          <td style="padding: 8px;">${c.position || 'N/A'}</td>
          <td style="padding: 8px;"><span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${c.billingType || 'Placement'}</span></td>
          <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 600;">$${Number(c.fee || c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const tableHeader = isFlatInvoice ? `
        <tr>
          <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px;">#</th>
          <th colspan="3" style="background: #004564; color: #fff; padding: 10px; text-align: left;">Service Description</th>
          <th style="text-align: right; width: 120px; background: #004564; color: #fff; padding: 10px;">Amount</th>
        </tr>
      ` : `
        <tr>
          <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px;">#</th>
          <th style="background: #004564; color: #fff; padding: 10px; text-align: left;">Placed Candidate</th>
          <th style="background: #004564; color: #fff; padding: 10px; text-align: left;">Position/Role</th>
          <th style="background: #004564; color: #fff; padding: 10px; text-align: left;">Type</th>
          <th style="text-align: right; width: 120px; background: #004564; color: #fff; padding: 10px;">Amount</th>
        </tr>
      `;

      const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : (inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
      const formattedDueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A';

      container.innerHTML = `
        <div style="font-family: 'Poppins', sans-serif; color: #002D38; padding: 20px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004564; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <h1 style="font-size: 22px; font-weight: 800; color: #002D38; margin: 0 0 4px 0;">${inv.senderName || 'Aurrum CRM'}</h1>
              <p style="margin: 2px 0; color: #005472; font-size: 12px;">${inv.senderTagline || 'Talent Insights & Recruitment Services'}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="font-size: 24px; font-weight: 800; color: #002D38; margin: 0 0 4px 0;">INVOICE</h2>
              <span style="display: inline-block; padding: 4px 8px; border: 2px solid #3b82f6; color: #3b82f6; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 11px;">${inv.status}</span>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 25px; background: #f8fafc;">
            <div>
              <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #A98B56; margin-bottom: 8px;">Billed To</h3>
              <p style="margin: 3px 0; font-size: 12px;"><strong>Client:</strong> ${inv.clientName}</p>
              ${inv.paymentTerms ? `<p style="margin: 3px 0; font-size: 12px;"><strong>Payment Terms:</strong> ${inv.paymentTerms}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #A98B56; margin-bottom: 8px;">Invoice Info</h3>
              <p style="margin: 3px 0; font-size: 12px;"><strong>Invoice Number:</strong> ${inv.invoiceNumber}</p>
              <p style="margin: 3px 0; font-size: 12px;"><strong>Issue Date:</strong> ${formattedDate}</p>
              <p style="margin: 3px 0; font-size: 12px;"><strong>Due Date:</strong> ${formattedDueDate}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <thead>${tableHeader}</thead>
            <tbody>${candidateRows}</tbody>
          </table>
          <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
            <table style="width: 280px; font-size: 12px; border-collapse: collapse;">
              <tr><td style="padding: 6px 0;">Subtotal:</td><td style="text-align: right; font-family: monospace; padding: 6px 0;">$${Number(inv.subtotal || inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
              ${inv.taxRate > 0 ? `<tr><td style="padding: 6px 0;">Tax (${inv.taxRate}%):</td><td style="text-align: right; font-family: monospace; padding: 6px 0;">+$${Number(inv.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
              ${inv.discountAmount > 0 ? `<tr><td style="padding: 6px 0;">Discount:</td><td style="text-align: right; font-family: monospace; color: #ef4444; padding: 6px 0;">-$${Number(inv.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
              <tr style="border-top: 2px solid #A98B56; font-size: 15px; font-weight: 800; color: #A98B56;">
                <td style="padding: 8px 0;">Total Due:</td>
                <td style="text-align: right; font-family: monospace; padding: 8px 0;">$${Number(inv.totalAmount || inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>
          ${(inv.bankName || inv.accountNumber || inv.payeeName) ? `
            <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11px;">
              <strong style="display: block; margin-bottom: 4px; color: #004564; text-transform: uppercase;">Bank Payment Instructions</strong>
              ${inv.payeeName ? `<p style="margin: 2px 0;"><strong>Payee Name:</strong> ${inv.payeeName}</p>` : ''}
              ${inv.bankName ? `<p style="margin: 2px 0;"><strong>Bank Name:</strong> ${inv.bankName}</p>` : ''}
              ${inv.bankBranch ? `<p style="margin: 2px 0;"><strong>Branch:</strong> ${inv.bankBranch}</p>` : ''}
              ${inv.accountNumber ? `<p style="margin: 2px 0;"><strong>Account Number:</strong> ${inv.accountNumber}</p>` : ''}
              ${inv.swiftCode ? `<p style="margin: 2px 0;"><strong>SWIFT / BIC:</strong> ${inv.swiftCode}</p>` : ''}
            </div>
          ` : ''}
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
      document.body.removeChild(container);

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

      pdf.save(`invoice-${inv.invoiceNumber || 'statement'}.pdf`);
    } catch (error) {
      console.error('[InvoiceList] Download PDF error:', error);
      alert('PDF download failed. Opening printable view instead.');
      handlePrintInvoice(inv);
    }
  };

  const handleEmailInvoice = (inv: any) => {
    try {
      const subject = encodeURIComponent(`Invoice Statement #${inv.invoiceNumber} from Aurrum CRM`);
      const body = encodeURIComponent(`Dear ${inv.clientName},\n\nPlease find your invoice statement #${inv.invoiceNumber} attached / available for review.\n\nTotal Amount Due: $${Number(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}\nDue Date: ${inv.dueDate || 'N/A'}\n\nThank you for partnering with Aurrum Company Recruitment Services.\n\nBest regards,\nAurrum CRM Team`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error('[InvoiceList] Email invoice error:', error);
      alert('Failed to open email client.');
    }
  };

  // Open printable window for Invoice
  const handlePrintInvoice = (inv: any) => {
    const itemsList = (inv.candidates && inv.candidates.length > 0) ? inv.candidates : [{ candidateName: inv.serviceDescription || 'Recruitment services', fee: inv.subtotal || 0 }];
    const candidateRows = itemsList.map((c: any, index: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; font-weight: 600;" colspan="3">${c.candidateName || c.description || 'Recruitment services'}</td>
        <td style="padding: 12px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600;">$${Number(c.fee || c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const tableHeader = `
      <tr>
        <th style="width: 50px; text-align: center;">#</th>
        <th colspan="3">Service Description</th>
        <th style="text-align: right; width: 120px;">Amount</th>
      </tr>
    `;

    const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : (inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
    const formattedDueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A';
    const activeLogoUrl = inv.senderLogo || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
    const activeSenderName = inv.senderName || '';
    const activeSenderTagline = inv.senderTagline || '';
    const activeSenderEmail = inv.senderEmail || '';
    const activeSenderWeb = inv.senderWeb || '';

    const printContent = `
      <html>
        <head>
          <title>Invoice - ${inv.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
            body { font-family: 'Poppins', sans-serif; padding: 20px; color: #002D38; line-height: 1.4; background: #fff; font-size: 12px; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004564; padding-bottom: 16px; margin-bottom: 20px; }
            .company-details h1 { font-size: 20px; font-weight: 800; color: #002D38; margin: 0 0 4px 0; letter-spacing: -0.025em; }
            .company-details p { margin: 2px 0; color: #005472; font-size: 12px; }
            .invoice-title-block { text-align: right; }
            .invoice-title-block h2 { font-size: 26px; font-weight: 800; color: #002D38; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 25px; background: #f8fafc; }
            .meta-section { padding: 16px; }
            .meta-section:first-child { border-right: 1px solid #cbd5e1; }
            .meta-section h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #A98B56; margin-bottom: 8px; letter-spacing: 0.05em; }
            .meta-section p { margin: 3px 0; font-size: 12px; }
            .meta-section strong { color: #002D38; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
            th { background-color: #004564; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding: 10px 12px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            tr { page-break-inside: avoid; }
            .summary-container { display: flex; justify-content: flex-end; margin-top: 15px; page-break-inside: avoid; }
            .summary-table { width: 300px; font-size: 12px; border: none; }
            .summary-table tr { border-bottom: 1px solid #f1f5f9; }
            .summary-table td { padding: 6px 0; border: none; }
            .summary-table .total-row { border-top: 2px solid #A98B56; font-size: 15px; font-weight: 800; color: #A98B56; }
            .notes-block { margin-top: 25px; padding: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; page-break-inside: avoid; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #005472; text-align: center; page-break-inside: avoid; }
            .stamp { display: inline-block; padding: 4px 8px; border: 2px solid; border-radius: 6px; font-weight: 800; text-transform: uppercase; transform: rotate(-5deg); font-size: 12px; }
            .stamp-Paid { border-color: #22c55e; color: #22c55e; }
            .stamp-Sent { border-color: #3b82f6; color: #3b82f6; }
            .stamp-Draft { border-color: #f59e0b; color: #f59e0b; }
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
          <div class="header-container" style="border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 20px;">
            <div class="company-details" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">
              ${activeLogoUrl ? `
                <img src="${activeLogoUrl}" alt="Logo" style="max-height: 45px; max-width: 150px; object-fit: contain; margin-bottom: 4px;" referrerPolicy="no-referrer" />
              ` : `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #A98B56 0%, #BC9B66 100%); display: flex; align-items: center; justify-content: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5 5 3Z"/>
                      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"/>
                    </svg>
                  </div>
                  <div style="display: flex; flex-direction: column; text-align: left; line-height: 1;">
                    <span style="font-weight: 800; font-size: 16px; color: #002D38; font-family: 'Inter', sans-serif;">
                      Aurrum <span style="color: #BC9B66; font-size: 11px; font-weight: 400;">CRM</span>
                    </span>
                    <span style="font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #005472; margin-top: 2px; font-family: 'Inter', sans-serif;">
                      Talent Insights
                    </span>
                  </div>
                </div>
              `}
              <div style="display: flex; flex-direction: column; gap: 2px;">
                ${activeSenderName ? `<h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #002D38;">${activeSenderName}</h1>` : ''}
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
            <div class="invoice-title-block">
              <h2>INVOICE</h2>
              <div class="stamp stamp-${inv.status}">${inv.status}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-section">
              <h3>Billed To</h3>
              <p><strong>Client:</strong> ${inv.clientName}</p>
              ${inv.paymentTerms ? `<p><strong>Payment Terms:</strong> ${inv.paymentTerms}</p>` : ''}
            </div>
            <div class="meta-section" style="text-align: right;">
              <h3>Invoice Info</h3>
              <p><strong>Invoice Number:</strong> ${inv.invoiceNumber}</p>
              <p><strong>Issue Date:</strong> ${formattedDate}</p>
              <p><strong>Due Date:</strong> ${formattedDueDate}</p>
            </div>
          </div>

          <table>
            ${tableHeader}
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

          ${inv.notes ? `
            <div class="notes-block">
              <strong style="display: block; margin-bottom: 4px; color: #1e293b;">Notes / Terms:</strong>
              <p style="margin: 0; color: #475569;">${inv.notes}</p>
            </div>
          ` : ''}

          ${(inv.bankName || inv.accountNumber || inv.payeeName) ? `
            <div class="notes-block">
              <strong style="display: block; margin-bottom: 4px; color: #004564; text-transform: uppercase;">Bank Payment Instructions</strong>
              ${inv.payeeName ? `<p style="margin: 2px 0;"><strong>Payee Name:</strong> ${inv.payeeName}</p>` : ''}
              ${inv.bankName ? `<p style="margin: 2px 0;"><strong>Bank Name:</strong> ${inv.bankName}</p>` : ''}
              ${inv.bankBranch ? `<p style="margin: 2px 0;"><strong>Branch:</strong> ${inv.bankBranch}</p>` : ''}
              ${inv.accountNumber ? `<p style="margin: 2px 0;"><strong>Account Number:</strong> ${inv.accountNumber}</p>` : ''}
              ${inv.swiftCode ? `<p style="margin: 2px 0;"><strong>SWIFT / BIC:</strong> ${inv.swiftCode}</p>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>${inv.invoiceFooterLine1 !== undefined ? inv.invoiceFooterLine1 : 'Thank you for partnering with Aurrum Company Recruitment Services.'}</p>
            <p>${inv.invoiceFooterLine2 !== undefined ? inv.invoiceFooterLine2 : `If you have any questions regarding this consolidated statement, contact us at ${activeSenderEmail || 'auriicsservices@gmail.com'}`}</p>
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

  // Pagination State for Invoices
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Filtered invoices for the History Tab (Memoized for performance)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
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
  }, [invoices, filterInvoiceStatus, searchInvoiceQuery]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInvoiceQuery, filterInvoiceStatus]);



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
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Invoices</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Generate and manage invoices for client billing, candidate placements, and agreements.
          </p>
        </div>

        <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          <button
            onClick={() => navigate('/invoice-builder')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all duration-300 crm-btn-gold text-white shadow-sm"
          >
            <Plus className="w-4 h-4" /> Custom Invoice
          </button>
        </div>
      </div>

      <div className="crm-card p-0 overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-primary)]">
          <div>
            <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">All Invoices</span>
            <p className="text-xs text-[var(--text-primary)] mt-0.5">Filter, search, print, or manage billing statements.</p>
          </div>
          <span className="crm-badge-gold text-xs px-3.5 py-1.5">
            Total Pending Amount: ${invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            <h3 className="font-bold text-[var(--text-primary)] text-lg">No invoices yet</h3>
            <p className="text-sm text-[var(--text-primary)] mt-1 max-w-sm">
              Create your first invoice for client billing, candidate placements, or contract services.
            </p>
            <button
              onClick={() => navigate('/invoice-builder')}
              className="mt-6 crm-btn-gold"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="crm-table-container border-0 rounded-none">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="pl-6">Invoice #</th>
                  <th>Client / Company</th>
                  <th>Total Amount</th>
                  <th>Due Date</th>
                  <th className="text-center">Status</th>
                  <th className="pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-[var(--text-primary)] font-sans">
                      <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                      <p className="text-sm font-bold">No invoices match your search query or status filter.</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Try resetting the invoice search or choosing a different status filter.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--card-hover-bg)] transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{inv.invoiceNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[var(--text-primary)] text-xs">{inv.clientName}</div>
                      {inv.paymentTerms ? <div className="text-[10px] text-[var(--text-muted)]">{inv.paymentTerms}</div> : null}
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
                          onClick={() => handleOpenInvoice(inv)}
                          className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                          title="View & Edit statement before print"
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
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-rose-500 transition"
                            title="Delete bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                <span className="text-xs text-[var(--text-muted)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 crm-btn-secondary text-xs disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-[var(--text-primary)] px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 crm-btn-secondary text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Editable Preview & Print Modal */}
      {viewingInvoice && editedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[24px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Actions Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] sticky top-0 z-20">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <FileText className="w-4.5 h-4.5 text-[var(--primary-gold)]" />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-tight">Editable Invoice Preview</span>
                  <input
                    type="text"
                    value={editedInvoice.invoiceNumber || ''}
                    onChange={(e) => setEditedInvoice({ ...editedInvoice, invoiceNumber: e.target.value })}
                    className="crm-input h-7 px-2 py-0.5 text-xs font-mono font-bold w-36"
                    placeholder="Invoice #"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEditedInvoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 crm-btn-secondary text-xs font-bold transition text-[var(--primary-gold)] border-[var(--primary-gold)]"
                  title="Save edits to database"
                >
                  <Check className="w-3.5 h-3.5" /> Save Edits
                </button>
                <button
                  onClick={() => handleDownloadPDF(editedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 crm-btn-secondary text-xs font-bold transition"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  onClick={() => handleEmailInvoice(editedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 crm-btn-secondary text-xs font-bold transition"
                  title="Email Statement"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => handlePrintInvoice(editedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 crm-btn-gold text-xs font-bold transition"
                  title="Print Statement"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                {(role === 'admin' || role === 'developer' || role === 'team_leader') && (
                  <button
                    onClick={() => handleDeleteInvoice(viewingInvoice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
                <button
                  onClick={() => { setViewingInvoice(null); setEditedInvoice(null); }}
                  className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Statement details - fully editable */}
            <div className="p-8 space-y-6">
              {editStatusMessage && (
                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  editStatusMessage.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                }`}>
                  <span>{editStatusMessage.type === 'success' ? '✓' : '✕'}</span>
                  <span>{editStatusMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[var(--border-color)]">
                <div className="flex flex-col items-start gap-3 w-full sm:w-1/2">
                  <Logo variant="invoice" size="lg" className="mb-1" />
                  <div className="w-full space-y-2">
                    <input
                      type="text"
                      value={editedInvoice.senderName || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, senderName: e.target.value })}
                      className="crm-input font-black text-[var(--primary-gold)] text-sm"
                      placeholder="Sender / Company Name"
                    />
                    <input
                      type="text"
                      value={editedInvoice.senderTagline || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, senderTagline: e.target.value })}
                      className="crm-input text-xs text-[var(--text-muted)]"
                      placeholder="Sender Tagline / Address"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editedInvoice.senderEmail || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, senderEmail: e.target.value })}
                        className="crm-input text-xs"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editedInvoice.senderWeb || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, senderWeb: e.target.value })}
                        className="crm-input text-xs"
                        placeholder="Website"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right w-full sm:w-auto space-y-2">
                  <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Statement of Account</div>
                  <div className="flex justify-end items-center gap-2">
                    <span className={
                      editedInvoice.status === 'Paid' ? 'crm-badge-success text-[10px] uppercase' :
                      editedInvoice.status === 'Sent' ? 'crm-badge-info text-[10px] uppercase' :
                      editedInvoice.status === 'Overdue' ? 'crm-badge-error text-[10px] uppercase' :
                      'crm-badge-warning text-[10px] uppercase'
                    }>
                      {editedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metagrid - Client & Dates editable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                <div className="space-y-2">
                  <label className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px]">Bill To Client</label>
                  <input
                    type="text"
                    value={editedInvoice.clientName || ''}
                    onChange={(e) => setEditedInvoice({ ...editedInvoice, clientName: e.target.value })}
                    className="crm-input text-xs font-black"
                    placeholder="Client Name"
                  />
                  <input
                    type="text"
                    value={editedInvoice.paymentTerms || ''}
                    onChange={(e) => setEditedInvoice({ ...editedInvoice, paymentTerms: e.target.value })}
                    className="crm-input text-xs"
                    placeholder="Contract Agreement / Terms"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-[var(--text-muted)] uppercase tracking-wide text-[10px]">Invoice Details & Dates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)]">Issue Date:</span>
                      <input
                        type="date"
                        value={editedInvoice.issueDate || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, issueDate: e.target.value })}
                        className="crm-input text-xs mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)]">Due Date:</span>
                      <input
                        type="date"
                        value={editedInvoice.dueDate || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, dueDate: e.target.value })}
                        className="crm-input text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Placement Fee Calculator Widget */}
              <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Placement Fee Calculator (Annual Package / CTC)</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono font-bold text-[var(--primary-gold)]">
                    Calculated Fee: (${Math.round((editedInvoice.calcCtc ?? 60000) * ((editedInvoice.calcFeePercent ?? 15) / 100)).toLocaleString()})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Candidate Annual CTC ($)</label>
                    <input
                      type="number"
                      value={editedInvoice.calcCtc ?? 60000}
                      onChange={(e) => {
                        const newCtc = parseFloat(e.target.value) || 0;
                        const feePct = editedInvoice.calcFeePercent ?? 15;
                        const calculatedFee = Math.round(newCtc * (feePct / 100));
                        const itemDesc = `Placement Fee (${feePct}% of $${newCtc.toLocaleString()} Annual CTC)`;
                        const taxRate = Number(editedInvoice.taxRate || 0);
                        const discount = Number(editedInvoice.discountAmount || 0);
                        const taxAmt = Math.round(calculatedFee * (taxRate / 100));
                        const total = Math.max(0, calculatedFee + taxAmt - discount);
                        setEditedInvoice({
                          ...editedInvoice,
                          calcCtc: newCtc,
                          serviceDescription: itemDesc,
                          subtotal: calculatedFee,
                          totalAmount: total,
                          candidates: []
                        });
                      }}
                      className="crm-input text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Fee Percentage (%)</label>
                    <input
                      type="number"
                      value={editedInvoice.calcFeePercent ?? 15}
                      onChange={(e) => {
                        const newPct = parseFloat(e.target.value) || 0;
                        const ctcVal = editedInvoice.calcCtc ?? 60000;
                        const calculatedFee = Math.round(ctcVal * (newPct / 100));
                        const itemDesc = `Placement Fee (${newPct}% of $${ctcVal.toLocaleString()} Annual CTC)`;
                        const taxRate = Number(editedInvoice.taxRate || 0);
                        const discount = Number(editedInvoice.discountAmount || 0);
                        const taxAmt = Math.round(calculatedFee * (taxRate / 100));
                        const total = Math.max(0, calculatedFee + taxAmt - discount);
                        setEditedInvoice({
                          ...editedInvoice,
                          calcFeePercent: newPct,
                          serviceDescription: itemDesc,
                          subtotal: calculatedFee,
                          totalAmount: total,
                          candidates: []
                        });
                      }}
                      className="crm-input text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Single Placement Fee Line Item (No add item / no candidates column) */}
              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-[var(--bg-primary)] px-4 py-2 border-b border-[var(--border-color)] flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Placement Fee Line Item</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Single consolidated service fee</span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-[#004564] dark:bg-[#002D38] text-white text-[10px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3 pl-4 w-12 text-center">#</th>
                      <th className="p-3">Service Description</th>
                      <th className="p-3 pr-4 text-right w-44">Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] text-xs">
                    <tr className="text-[var(--text-secondary)]">
                      <td className="p-3 pl-4 font-mono text-[var(--text-muted)] text-center">1</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editedInvoice.serviceDescription || 'Placement Fee - Recruitment Services'}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, serviceDescription: e.target.value })}
                          className="crm-input text-xs font-semibold w-full"
                          placeholder="Service description..."
                        />
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <input
                          type="number"
                          value={editedInvoice.subtotal || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const taxRate = Number(editedInvoice.taxRate || 0);
                            const discount = Number(editedInvoice.discountAmount || 0);
                            const taxAmt = Math.round(val * (taxRate / 100));
                            const total = Math.max(0, val + taxAmt - discount);
                            setEditedInvoice({ ...editedInvoice, subtotal: val, totalAmount: total });
                          }}
                          className="crm-input text-xs font-mono font-bold text-right w-36 ml-auto"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Summary & Tax/Discount editable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-3 bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] text-xs">
                  <div className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Taxes & Discounts Adjustment</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={editedInvoice.taxRate || 0}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, taxRate: parseFloat(e.target.value) || 0 })}
                        className="crm-input text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Discount Amount ($)</label>
                      <input
                        type="number"
                        value={editedInvoice.discountAmount || 0}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, discountAmount: parseFloat(e.target.value) || 0 })}
                        className="crm-input text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-xs">
                    {(() => {
                      const sub = editedInvoice.useFlatSubtotal || (!editedInvoice.candidates || editedInvoice.candidates.length === 0)
                        ? Number(editedInvoice.subtotal || 0)
                        : (editedInvoice.candidates || []).reduce((s: number, c: any) => s + Number(c.fee || 0), 0);
                      const tax = Math.round(sub * ((Number(editedInvoice.taxRate) || 0) / 100));
                      const disc = Number(editedInvoice.discountAmount) || 0;
                      const total = Math.max(0, sub + tax - disc);
                      const pendingDue = editedInvoice.status === 'Paid' ? 0 : total;
                      return (
                        <>
                          <div className="flex justify-between text-[var(--text-muted)]">
                            <span>Subtotal:</span>
                            <span className="font-mono font-semibold text-[var(--text-primary)]">${sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          {tax > 0 && (
                            <div className="flex justify-between text-[var(--text-muted)]">
                              <span>Tax ({editedInvoice.taxRate}%):</span>
                              <span className="font-mono font-semibold text-[var(--text-primary)]">+${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {disc > 0 && (
                            <div className="flex justify-between text-[var(--text-muted)]">
                              <span>Discount:</span>
                              <span className="font-mono font-semibold text-rose-500">-${disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-black border-t border-[var(--border-color)] pt-2 text-[var(--text-primary)]">
                            <span>Total statement due:</span>
                            <span className="font-mono text-[var(--primary-gold)]">${pendingDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Notes Field editable */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Contract / Terms Notes:</label>
                <textarea
                  value={editedInvoice.notes || ''}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, notes: e.target.value })}
                  className="crm-input text-xs w-full h-20"
                  placeholder="Terms and payment notes..."
                />
              </div>

              {/* Bank Account Details editable */}
              <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-gold)] mb-1">Bank Payment Instructions & Account Details</span>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">Payee Name</label>
                  <input
                    type="text"
                    value={editedInvoice.payeeName || ''}
                    onChange={(e) => setEditedInvoice({ ...editedInvoice, payeeName: e.target.value })}
                    className="crm-input text-xs font-semibold"
                    placeholder="Payee Account Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editedInvoice.bankName || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, bankName: e.target.value })}
                      className="crm-input text-xs"
                      placeholder="Bank Name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Branch</label>
                    <input
                      type="text"
                      value={editedInvoice.bankBranch || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, bankBranch: e.target.value })}
                      className="crm-input text-xs"
                      placeholder="Branch"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editedInvoice.accountNumber || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, accountNumber: e.target.value })}
                      className="crm-input text-xs font-mono"
                      placeholder="Account Number"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Swift / BIC Code</label>
                    <input
                      type="text"
                      value={editedInvoice.swiftCode || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, swiftCode: e.target.value })}
                      className="crm-input text-xs font-mono"
                      placeholder="Swift / BIC Code"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Footer / Closing Statement editable */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Invoice Footer Statement (Editable):</label>
                <input
                  type="text"
                  value={editedInvoice.invoiceFooterLine1 !== undefined ? editedInvoice.invoiceFooterLine1 : 'Thank you for partnering with Aurrum Company Recruitment Services.'}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, invoiceFooterLine1: e.target.value })}
                  className="crm-input text-xs w-full"
                  placeholder="Footer Line 1"
                />
                <input
                  type="text"
                  value={editedInvoice.invoiceFooterLine2 !== undefined ? editedInvoice.invoiceFooterLine2 : `If you have any questions regarding this consolidated statement, contact us at ${editedInvoice.senderEmail || 'auriicsservices@gmail.com'}`}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, invoiceFooterLine2: e.target.value })}
                  className="crm-input text-xs w-full"
                  placeholder="Footer Line 2"
                />
              </div>

              {/* Admin Actions Status controls */}
              {(role === 'admin' || role === 'developer' || role === 'team_leader') && (
                <div className="pt-6 border-t border-[var(--border-color)] flex flex-wrap gap-2 items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Update Settlement Status</div>
                  <div className="flex gap-1">
                    {['Draft', 'Sent', 'Paid', 'Overdue'].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          handleUpdateStatus(viewingInvoice.id, status);
                          setEditedInvoice({ ...editedInvoice, status });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          editedInvoice.status === status
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

