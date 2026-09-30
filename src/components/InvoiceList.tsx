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
  Download, Mail, Sliders
} from 'lucide-react';
import { InvoiceDesignEditor } from './InvoiceDesignEditor';

interface BilledCandidate {
  candidateId: string;
  candidateName: string;
  position: string;
  billingType: string;
  fee: number;
}

const getEffectiveSubtotal = (inv: any) => {
  if (!inv) return 0;
  if (inv.subtotal !== undefined && inv.subtotal !== null && !isNaN(inv.subtotal) && Number(inv.subtotal) > 0) {
    return Number(inv.subtotal);
  }
  if (inv.candidates && inv.candidates.length > 0) {
    const candSum = inv.candidates.reduce((sum: number, c: any) => sum + Number(c.fee || c.amount || 0), 0);
    if (candSum > 0) return candSum;
  }
  if (inv.totalAmount !== undefined && inv.totalAmount !== null && !isNaN(inv.totalAmount) && Number(inv.totalAmount) > 0) {
    return Number(inv.totalAmount);
  }
  return Number(inv.subtotal || inv.totalAmount || 0);
};

const getEffectiveTotal = (inv: any) => {
  if (!inv) return 0;
  if (inv.totalAmount !== undefined && inv.totalAmount !== null && !isNaN(inv.totalAmount) && Number(inv.totalAmount) > 0) {
    return Number(inv.totalAmount);
  }
  const sub = getEffectiveSubtotal(inv);
  const taxRate = Number(inv.taxRate || 0);
  const taxAmt = Math.round(sub * (taxRate / 100));
  const disc = Number(inv.discountAmount || 0);
  return Math.max(0, sub + taxAmt - disc);
};

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Invoice View & Editable Preview
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [editedInvoice, setEditedInvoice] = useState<any | null>(null);
  const [editStatusMessage, setEditStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalTab, setModalTab] = useState<'content' | 'branding' | 'bank' | 'signatory' | 'layout'>('content');

  const handleOpenInvoice = (inv: any) => {
    setViewingInvoice(inv);
    const cloned = JSON.parse(JSON.stringify(inv));
    if (!cloned.serviceDescription) {
      cloned.serviceDescription = 'Placement Fee - Recruitment Services';
    }
    const effectiveSub = getEffectiveSubtotal(cloned);
    cloned.subtotal = effectiveSub;
    const taxRate = Number(cloned.taxRate || 0);
    const taxAmt = Math.round(effectiveSub * (taxRate / 100));
    const disc = Number(cloned.discountAmount || 0);
    cloned.totalAmount = Math.max(0, effectiveSub + taxAmt - disc);

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
      const subtotal = getEffectiveSubtotal(editedInvoice);
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
    const invNum = viewingInvoice?.invoiceNumber || invoiceId;
    if (!window.confirm(`Are you sure you want to delete invoice #${invNum}? This action cannot be undone and will permanently remove all associated payment and billing records.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'consolidated_invoices', invoiceId));
      setViewingInvoice(null);
      setEditedInvoice(null);
      setEditStatusMessage({ type: 'success', text: `Invoice #${invNum} deleted successfully.` });
      setTimeout(() => setEditStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setEditStatusMessage({ type: 'error', text: 'Failed to delete invoice. Please check permissions.' });
    }
  };

  const handleDownloadPDF = async (inv: any) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '794px';
      container.style.height = '1123px';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.boxSizing = 'border-box';
      container.style.fontFamily = "'Poppins', sans-serif";
      container.style.color = '#002D38';
      container.style.overflow = 'hidden';

      const effectiveSubForPdf = getEffectiveSubtotal(inv);
      const isFlatInvoice = inv.useFlatSubtotal || (effectiveSubForPdf > 0 && (!inv.candidates || inv.candidates.length === 0));
      const candidateRows = isFlatInvoice ? `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 10px 12px; text-align: center; color: #002D38;">1</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #002D38;" colspan="3">${inv.serviceDescription || 'Placement Fee - Recruitment Services'}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 600; color: #002D38;">$${effectiveSubForPdf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      ` : (inv.candidates || []).map((c: any, index: number) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 8px 12px; text-align: center; color: #002D38;">${index + 1}</td>
          <td style="padding: 8px 12px; font-weight: 600; color: #002D38;">${c.candidateName}</td>
          <td style="padding: 8px 12px; color: #475569;">${c.position || 'N/A'}</td>
          <td style="padding: 8px 12px;"><span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${c.billingType || 'Placement'}</span></td>
          <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-weight: 600; color: #002D38;">$${Number(c.fee || c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const tableHeader = isFlatInvoice ? `
        <tr>
          <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">#</th>
          <th colspan="3" style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Service Description</th>
          <th style="text-align: right; width: 130px; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Amount</th>
        </tr>
      ` : `
        <tr>
          <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">#</th>
          <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Placed Candidate</th>
          <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Position/Role</th>
          <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Type</th>
          <th style="text-align: right; width: 130px; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Amount</th>
        </tr>
      `;

      const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : (inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
      const formattedDueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A';

      const sub = getEffectiveSubtotal(inv);
      const taxRate = Number(inv.taxRate || 0);
      const taxAmt = Math.round(sub * (taxRate / 100));
      const disc = Number(inv.discountAmount || 0);
      const total = getEffectiveTotal(inv);

      const logoVariant = inv.logoVariant || 'dark';
      const darkLogo = inv.darkLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
      const whiteLogo = inv.whiteLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg';
      const displayLogo = logoVariant === 'white' 
        ? whiteLogo 
        : (logoVariant === 'custom' && inv.logoUrl ? inv.logoUrl : darkLogo);
      const watermarkImg = inv.watermarkUrl || displayLogo;

      const logoContainerStyle = 'width: 48px; height: 48px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 6px;';

      const cleanSigName = (!inv.signatoryName || inv.signatoryName.includes('dfgvdsf') || inv.signatoryName.includes('gvsdfesf')) ? 'Mayur Jungi' : inv.signatoryName;
      const cleanSigTitle = (!inv.signatoryTitle || inv.signatoryTitle.includes('dfgvdsf') || inv.signatoryTitle.includes('gvsdfesf')) ? 'Operations Manager' : inv.signatoryTitle;

      const watermarkText = inv.watermarkText || 'AURRUM';

      container.innerHTML = `
        <div style="font-family: 'Poppins', sans-serif; color: #002D38; background: #ffffff; position: relative; width: 794px; height: 1123px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; padding: 40px;">
          <!-- Centered Background Watermark Image or Text -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
            ${inv.watermarkUrl 
              ? `<img src="${inv.watermarkUrl}" alt="Watermark" style="width: 340px; height: 340px; object-fit: contain; opacity: 0.05;" crossorigin="anonymous" />`
              : (inv.watermarkText 
                  ? `<div style="font-weight: 900; font-size: 64px; text-transform: uppercase; letter-spacing: 0.1em; color: #002D38; opacity: 0.04; transform: rotate(-25deg); user-select: none;">${inv.watermarkText}</div>`
                  : `<img src="${watermarkImg}" alt="Watermark" style="width: 340px; height: 340px; object-fit: contain; opacity: 0.05;" crossorigin="anonymous" />`)}
          </div>

          <div style="position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004564; padding-bottom: 16px; margin-bottom: 20px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="${logoContainerStyle}">
                  <img src="${displayLogo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
                <div>
                  <h1 style="font-size: 15px; font-weight: 800; color: #002D38; margin: 0 0 2px 0;">${inv.senderName || 'AURRUM SERVICES'}</h1>
                  <p style="margin: 0; color: #005472; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${inv.senderTagline || 'Talent Insights & Recruitment Services'}</p>
                  <p style="margin: 3px 0 0 0; color: #64748b; font-size: 9px; max-width: 260px; line-height: 1.3;">${inv.senderAddress || '513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015'}</p>
                  <p style="margin: 3px 0 0 0; color: #A98B56; font-size: 10px; font-weight: 700;">${inv.senderEmail || 'auriicsservices@gmail.com'} | ${inv.senderWeb || 'aurrum.co'}</p>
                </div>
              </div>
              <div style="text-align: right; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; min-width: 190px;">
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <h2 style="font-size: 18px; font-weight: 900; color: #002D38; margin: 0;">INVOICE</h2>
                  <span style="padding: 2px 6px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 9px;">${inv.status}</span>
                </div>
                <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Invoice No:</strong> <span style="font-family: monospace; font-weight: bold; color: #002D38;">${inv.invoiceNumber}</span></p>
                <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Issue Date:</strong> ${formattedDate}</p>
                <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Due Date:</strong> ${formattedDueDate}</p>
              </div>
            </div>

            <!-- Client & Service Box -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 20px; background: #f8fafc;">
              <div>
                <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #A98B56; margin-bottom: 4px; letter-spacing: 0.05em;">Billed To</h3>
                <p style="margin: 2px 0; font-size: 11px; font-weight: 800; color: #002D38;">${inv.clientName}</p>
                ${inv.clientAddress ? `<p style="margin: 2px 0; font-size: 10px; color: #002D38; white-space: pre-wrap;">${inv.clientAddress}</p>` : ''}
                ${inv.paymentTerms ? `<p style="margin: 3px 0 0 0; font-size: 10px; color: #002D38;"><strong>Payment Terms:</strong> ${inv.paymentTerms}</p>` : ''}
              </div>
              <div style="text-align: right;">
                <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #A98B56; margin-bottom: 4px; letter-spacing: 0.05em;">Service Description</h3>
                <p style="margin: 2px 0; font-size: 10px; font-weight: 700; color: #002D38;">${inv.serviceDescription || 'Professional Recruitment & Talent Search Services'}</p>
              </div>
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
              <thead>${tableHeader}</thead>
              <tbody>${candidateRows}</tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
              <table style="width: 260px; font-size: 11px; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Subtotal:</td><td style="text-align: right; font-family: monospace; font-weight: 700; padding: 5px 0; color: #002D38;">$${sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                ${taxRate > 0 ? `<tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Tax (${taxRate}%):</td><td style="text-align: right; font-family: monospace; padding: 5px 0; color: #002D38;">+$${taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
                ${disc > 0 ? `<tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Discount:</td><td style="text-align: right; font-family: monospace; color: #ef4444; padding: 5px 0;">-$${disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
                <tr style="border-top: 2px solid #A98B56; background-color: #f1f5f9; font-size: 13px; font-weight: 900; color: #A98B56;">
                  <td style="padding: 8px 8px; text-transform: uppercase; font-size: 10px; color: #002D38;">Total Due:</td>
                  <td style="text-align: right; font-family: monospace; padding: 8px 8px; color: #A98B56;">$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>

            <!-- Footer / Bank & Signatory -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 16px; border-top: 1px solid #cbd5e1;">
              <div style="width: 52%;">
                ${(inv.bankName || inv.accountNumber || inv.payeeName) ? `
                  <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px;">
                    <strong style="display: block; margin-bottom: 3px; color: #004564; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Bank Payment Instructions</strong>
                    ${inv.payeeName ? `<p style="margin: 2px 0; color: #334155;"><strong>Payee:</strong> ${inv.payeeName}</p>` : ''}
                    ${inv.bankName ? `<p style="margin: 2px 0; color: #334155;"><strong>Bank:</strong> ${inv.bankName}</p>` : ''}
                    ${inv.accountNumber ? `<p style="margin: 2px 0; color: #334155;"><strong>A/C:</strong> <span style="font-family: monospace; font-weight: bold;">${inv.accountNumber}</span></p>` : ''}
                    ${inv.swiftCode ? `<p style="margin: 2px 0; color: #334155;"><strong>SWIFT:</strong> <span style="font-family: monospace; font-weight: bold;">${inv.swiftCode}</span></p>` : ''}
                  </div>
                ` : `
                  <div style="font-size: 10px; color: #64748b;">
                    <p style="font-weight: bold; color: #002D38; margin: 0 0 2px 0;">Thank you for your business!</p>
                    <p style="margin: 0;">Please remit payment according to agreed terms.</p>
                  </div>
                `}
              </div>
              <div style="text-align: right;">
                ${inv.signatureUrl 
                  ? `<img src="${inv.signatureUrl}" alt="Signature" style="max-height: 48px; max-width: 160px; object-fit: contain; margin-bottom: 2px;" crossorigin="anonymous" />`
                  : `<div style="font-family: serif; font-style: italic; font-size: 22px; color: #A98B56; font-weight: bold; margin-bottom: 2px;">${cleanSigName}</div>`}
                <p style="margin: 0; font-weight: 900; font-size: 12px; color: #002D38;">${cleanSigName}</p>
                <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">${cleanSigTitle}</p>
              </div>
            </div>

            <!-- Bottom Footer Statement -->
            <div style="text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 8px; color: #94a3b8;">
              ${inv.invoiceFooterLine1 !== undefined ? inv.invoiceFooterLine1 : 'Thank you for partnering with Aurrum Company Recruitment Services.'} | ${inv.invoiceFooterLine2 !== undefined ? inv.invoiceFooterLine2 : 'Authorized Statement of Account'}
            </div>
          </div>
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
      const body = encodeURIComponent(`Dear ${inv.clientName},\n\nPlease find your invoice statement #${inv.invoiceNumber} attached / available for review.\n\nTotal Amount Due: $${getEffectiveTotal(inv).toLocaleString(undefined, { minimumFractionDigits: 2 })}\nDue Date: ${inv.dueDate || 'N/A'}\n\nThank you for partnering with Aurrum Company Recruitment Services.\n\nBest regards,\nAurrum CRM Team`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error('[InvoiceList] Email invoice error:', error);
      alert('Failed to open email client.');
    }
  };

  // Open printable window for Invoice
  const handlePrintInvoice = (inv: any) => {
    const effectiveSubForPrint = getEffectiveSubtotal(inv);
    const isFlatInvoice = inv.useFlatSubtotal || (effectiveSubForPrint > 0 && (!inv.candidates || inv.candidates.length === 0));
    const candidateRows = isFlatInvoice ? `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 10px 12px; text-align: center; color: #002D38;">1</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #002D38;" colspan="3">${inv.serviceDescription || 'Placement Fee - Recruitment Services'}</td>
        <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 600; color: #002D38;">$${effectiveSubForPrint.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    ` : (inv.candidates || []).map((c: any, index: number) => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px 12px; text-align: center; color: #002D38;">${index + 1}</td>
        <td style="padding: 8px 12px; font-weight: 600; color: #002D38;">${c.candidateName}</td>
        <td style="padding: 8px 12px; color: #475569;">${c.position || 'N/A'}</td>
        <td style="padding: 8px 12px;"><span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${c.billingType || 'Placement'}</span></td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-weight: 600; color: #002D38;">$${Number(c.fee || c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const tableHeader = isFlatInvoice ? `
      <tr>
        <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">#</th>
        <th colspan="3" style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Service Description</th>
        <th style="text-align: right; width: 130px; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Amount</th>
      </tr>
    ` : `
      <tr>
        <th style="width: 50px; text-align: center; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">#</th>
        <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Placed Candidate</th>
        <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Position/Role</th>
        <th style="background: #004564; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase;">Type</th>
        <th style="text-align: right; width: 130px; background: #004564; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Amount</th>
      </tr>
    `;

    const formattedDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : (inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString());
    const formattedDueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A';

    const sub = getEffectiveSubtotal(inv);
    const taxRate = Number(inv.taxRate || 0);
    const taxAmt = Math.round(sub * (taxRate / 100));
    const disc = Number(inv.discountAmount || 0);
    const total = getEffectiveTotal(inv);

    const logoVariant = inv.logoVariant || 'dark';
    const darkLogo = inv.darkLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
    const whiteLogo = inv.whiteLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg';
    const displayLogo = logoVariant === 'white' 
      ? whiteLogo 
      : (logoVariant === 'custom' && inv.logoUrl ? inv.logoUrl : darkLogo);
    const watermarkImg = inv.watermarkUrl || displayLogo;

    const logoContainerStyle = 'width: 48px; height: 48px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 6px;';

    const cleanSigName = (!inv.signatoryName || inv.signatoryName.includes('dfgvdsf') || inv.signatoryName.includes('gvsdfesf')) ? 'Mayur Jungi' : inv.signatoryName;
    const cleanSigTitle = (!inv.signatoryTitle || inv.signatoryTitle.includes('dfgvdsf') || inv.signatoryTitle.includes('gvsdfesf')) ? 'Operations Manager' : inv.signatoryTitle;

    const printContent = `
      <html>
        <head>
          <title>Invoice - ${inv.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: 'Poppins', sans-serif;
              color: #002D38;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-page {
              width: 794px;
              height: 1123px;
              box-sizing: border-box;
              padding: 40px;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
              margin: 0 auto;
            }
            @media print {
              body {
                background: #ffffff;
              }
              .a4-page {
                width: 210mm;
                height: 297mm;
                page-break-after: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            <!-- Centered Background Watermark Image or Text -->
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;">
              ${inv.watermarkUrl 
                ? `<img src="${inv.watermarkUrl}" alt="Watermark" style="width: 340px; height: 340px; object-fit: contain; opacity: 0.05;" crossorigin="anonymous" />`
                : (inv.watermarkText 
                    ? `<div style="font-weight: 900; font-size: 64px; text-transform: uppercase; letter-spacing: 0.1em; color: #002D38; opacity: 0.04; transform: rotate(-25deg); user-select: none;">${inv.watermarkText}</div>`
                    : `<img src="${watermarkImg}" alt="Watermark" style="width: 340px; height: 340px; object-fit: contain; opacity: 0.05;" crossorigin="anonymous" />`)}
            </div>

            <div style="position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column;">
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004564; padding-bottom: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="${logoContainerStyle}">
                    <img src="${displayLogo}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                  </div>
                  <div>
                    <h1 style="font-size: 15px; font-weight: 800; color: #002D38; margin: 0 0 2px 0;">${inv.senderName || 'AURRUM SERVICES'}</h1>
                    <p style="margin: 0; color: #005472; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${inv.senderTagline || 'Talent Insights & Recruitment Services'}</p>
                    <p style="margin: 3px 0 0 0; color: #64748b; font-size: 9px; max-width: 260px; line-height: 1.3;">${inv.senderAddress || '513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015'}</p>
                    <p style="margin: 3px 0 0 0; color: #A98B56; font-size: 10px; font-weight: 700;">${inv.senderEmail || 'auriicsservices@gmail.com'} | ${inv.senderWeb || 'aurrum.co'}</p>
                  </div>
                </div>
                <div style="text-align: right; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; min-width: 190px;">
                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <h2 style="font-size: 18px; font-weight: 900; color: #002D38; margin: 0;">INVOICE</h2>
                    <span style="padding: 2px 6px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 9px;">${inv.status}</span>
                  </div>
                  <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Invoice No:</strong> <span style="font-family: monospace; font-weight: bold; color: #002D38;">${inv.invoiceNumber}</span></p>
                  <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Issue Date:</strong> ${formattedDate}</p>
                  <p style="margin: 2px 0; font-size: 10px;"><strong style="color: #64748b;">Due Date:</strong> ${formattedDueDate}</p>
                </div>
              </div>

              <!-- Client & Service Box -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 20px; background: #f8fafc;">
                <div>
                  <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #A98B56; margin-bottom: 4px; letter-spacing: 0.05em;">Billed To</h3>
                  <p style="margin: 2px 0; font-size: 11px; font-weight: 800; color: #002D38;">${inv.clientName}</p>
                  ${inv.clientAddress ? `<p style="margin: 2px 0; font-size: 10px; color: #002D38; white-space: pre-wrap;">${inv.clientAddress}</p>` : ''}
                  ${inv.paymentTerms ? `<p style="margin: 3px 0 0 0; font-size: 10px; color: #002D38;"><strong>Payment Terms:</strong> ${inv.paymentTerms}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <h3 style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #A98B56; margin-bottom: 4px; letter-spacing: 0.05em;">Service Description</h3>
                  <p style="margin: 2px 0; font-size: 10px; font-weight: 700; color: #002D38;">${inv.serviceDescription || 'Professional Recruitment & Talent Search Services'}</p>
                </div>
              </div>

              <!-- Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                <thead>${tableHeader}</thead>
                <tbody>${candidateRows}</tbody>
              </table>

              <!-- Totals -->
              <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <table style="width: 260px; font-size: 11px; border-collapse: collapse;">
                  <tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Subtotal:</td><td style="text-align: right; font-family: monospace; font-weight: 700; padding: 5px 0; color: #002D38;">$${sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                  ${taxRate > 0 ? `<tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Tax (${taxRate}%):</td><td style="text-align: right; font-family: monospace; padding: 5px 0; color: #002D38;">+$${taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
                  ${disc > 0 ? `<tr><td style="padding: 5px 0; color: #64748b; font-weight: 700;">Discount:</td><td style="text-align: right; font-family: monospace; color: #ef4444; padding: 5px 0;">-$${disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>` : ''}
                  <tr style="border-top: 2px solid #A98B56; background-color: #f1f5f9; font-size: 13px; font-weight: 900; color: #A98B56;">
                    <td style="padding: 8px 8px; text-transform: uppercase; font-size: 10px; color: #002D38;">Total Due:</td>
                    <td style="text-align: right; font-family: monospace; padding: 8px 8px; color: #A98B56;">$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>

              <!-- Footer / Bank & Signatory -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 16px; border-top: 1px solid #cbd5e1;">
                <div style="width: 52%;">
                  ${(inv.bankName || inv.accountNumber || inv.payeeName) ? `
                    <div style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 10px;">
                      <strong style="display: block; margin-bottom: 3px; color: #004564; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">Bank Payment Instructions</strong>
                      ${inv.payeeName ? `<p style="margin: 2px 0; color: #334155;"><strong>Payee:</strong> ${inv.payeeName}</p>` : ''}
                      ${inv.bankName ? `<p style="margin: 2px 0; color: #334155;"><strong>Bank:</strong> ${inv.bankName}</p>` : ''}
                      ${inv.accountNumber ? `<p style="margin: 2px 0; color: #334155;"><strong>A/C:</strong> <span style="font-family: monospace; font-weight: bold;">${inv.accountNumber}</span></p>` : ''}
                      ${inv.swiftCode ? `<p style="margin: 2px 0; color: #334155;"><strong>SWIFT:</strong> <span style="font-family: monospace; font-weight: bold;">${inv.swiftCode}</span></p>` : ''}
                    </div>
                  ` : `
                    <div style="font-size: 10px; color: #64748b;">
                      <p style="font-weight: bold; color: #002D38; margin: 0 0 2px 0;">Thank you for your business!</p>
                      <p style="margin: 0;">Please remit payment according to agreed terms.</p>
                    </div>
                  `}
                </div>
                <div style="text-align: right;">
                  ${inv.signatureUrl 
                    ? `<img src="${inv.signatureUrl}" alt="Signature" style="max-height: 48px; max-width: 160px; object-fit: contain; margin-bottom: 2px;" crossorigin="anonymous" />`
                    : `<div style="font-family: serif; font-style: italic; font-size: 22px; color: #A98B56; font-weight: bold; margin-bottom: 2px;">${cleanSigName}</div>`}
                  <p style="margin: 0; font-weight: 900; font-size: 12px; color: #002D38;">${cleanSigName}</p>
                  <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">${cleanSigTitle}</p>
                </div>
              </div>

              <!-- Bottom Footer Statement -->
              <div style="text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 8px; color: #94a3b8;">
                ${inv.invoiceFooterLine1 !== undefined ? inv.invoiceFooterLine1 : 'Thank you for partnering with Aurrum Company Recruitment Services.'} | ${inv.invoiceFooterLine2 !== undefined ? inv.invoiceFooterLine2 : 'Authorized Statement of Account'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
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
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Invoices & PDF Studio</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Generate and manage client invoices and customize professional PDF layout and branding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)] gap-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'list' 
                  ? 'bg-[var(--primary-gold)] text-white shadow-xs' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileText size={14} /> Invoices List
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor' 
                  ? 'bg-[var(--primary-gold)] text-white shadow-xs' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sliders size={14} /> PDF Design & Editor
            </button>
          </div>

          <button
            onClick={() => navigate('/invoice-builder')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-tight transition-all duration-300 crm-btn-gold text-white shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Custom Invoice
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <InvoiceDesignEditor />
      ) : (
        <div className="crm-card p-0 overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-primary)]">
          <div>
            <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">All Invoices</span>
            <p className="text-xs text-[var(--text-primary)] mt-0.5">Filter, search, print, or manage billing statements.</p>
          </div>
          <span className="crm-badge-gold text-xs px-3.5 py-1.5">
            Total Pending Amount: ${invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + getEffectiveTotal(inv), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        ${getEffectiveTotal(inv).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          onClick={() => { handleOpenInvoice(inv); setModalTab('content'); }}
                          className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--primary-gold)] transition cursor-pointer"
                          title="Edit Invoice Elements & Design"
                        >
                          <Pencil className="w-4 h-4" />
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
      )}

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

            {/* Modal Tab Bar for Visual Invoice Element Customization */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 overflow-x-auto">
              <button
                onClick={() => setModalTab('content')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  modalTab === 'content'
                    ? 'border-[var(--primary-gold)] text-[var(--primary-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                📄 Content & Items
              </button>
              <button
                onClick={() => setModalTab('branding')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  modalTab === 'branding'
                    ? 'border-[var(--primary-gold)] text-[var(--primary-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                🖼️ Logo & Branding
              </button>
              <button
                onClick={() => setModalTab('bank')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  modalTab === 'bank'
                    ? 'border-[var(--primary-gold)] text-[var(--primary-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                🏦 Bank & Payment
              </button>
              <button
                onClick={() => setModalTab('signatory')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  modalTab === 'signatory'
                    ? 'border-[var(--primary-gold)] text-[var(--primary-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                ✍️ Signatory & Footer
              </button>
              <button
                onClick={() => setModalTab('layout')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  modalTab === 'layout'
                    ? 'border-[var(--primary-gold)] text-[var(--primary-gold)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                📐 Layout & Watermark
              </button>
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

              {/* BRANDING TAB */}
              {modalTab === 'branding' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                    <h3 className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Logo Display & Variant Selection</h3>
                    <p className="text-xs text-[var(--text-muted)]">Select the active logo variant and upload separate image files for Dark Logo and White Logo from your computer.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setEditedInvoice({ ...editedInvoice, logoVariant: 'dark' })}
                        className={`p-4 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                          editedInvoice.logoVariant !== 'white' && editedInvoice.logoVariant !== 'custom'
                            ? 'border-[var(--primary-gold)] bg-[var(--primary-gold)]/10 ring-2 ring-[var(--primary-gold)]'
                            : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--primary-gold)]'
                        }`}
                      >
                        <div className="w-10 h-10 bg-[#002D38] rounded-lg flex items-center justify-center p-2">
                          <img src={editedInvoice.darkLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg'} alt="Dark Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">Dark Logo Variant</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Standard high-contrast dark logo</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditedInvoice({ ...editedInvoice, logoVariant: 'white' })}
                        className={`p-4 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                          editedInvoice.logoVariant === 'white'
                            ? 'border-[var(--primary-gold)] bg-[var(--primary-gold)]/10 ring-2 ring-[var(--primary-gold)]'
                            : 'border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--primary-gold)]'
                        }`}
                      >
                        <div className="w-10 h-10 bg-[#004564] rounded-lg flex items-center justify-center p-2">
                          <img src={editedInvoice.whiteLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg'} alt="White Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">White Logo Variant</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Optimized for dark headers</div>
                        </div>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Upload Dark Logo (From Computer)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const base64Url = uploadEvent.target?.result as string;
                                if (base64Url) {
                                  setEditedInvoice({ ...editedInvoice, darkLogoUrl: base64Url, logoVariant: 'dark' });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[var(--primary-gold)] file:text-white hover:file:opacity-90 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Upload White Logo (From Computer)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const base64Url = uploadEvent.target?.result as string;
                                if (base64Url) {
                                  setEditedInvoice({ ...editedInvoice, whiteLogoUrl: base64Url, logoVariant: 'white' });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[#004564] file:text-white hover:file:opacity-90 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Watermark Background Customization */}
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                    <h3 className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Watermark Customization (Background Image)</h3>
                    <p className="text-xs text-[var(--text-muted)]">Upload a custom image to be displayed as the faint background watermark across the invoice canvas and PDF export.</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Upload Watermark Image Background (From Computer)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const base64Url = uploadEvent.target?.result as string;
                                if (base64Url) {
                                  setEditedInvoice({ ...editedInvoice, watermarkUrl: base64Url });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--primary-gold)] file:text-white hover:file:opacity-90 cursor-pointer"
                        />
                      </div>
                      {editedInvoice.watermarkUrl && (
                        <div className="flex items-center justify-between p-2.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                          <div className="flex items-center gap-2">
                            <img src={editedInvoice.watermarkUrl} alt="Watermark Preview" className="w-8 h-8 object-contain rounded bg-white p-0.5 border" />
                            <span className="text-xs font-bold text-[var(--text-primary)]">Custom Watermark Active</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditedInvoice({ ...editedInvoice, watermarkUrl: '' })}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Remove / Reset Watermark
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                    <h3 className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Company Sender Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Company / Sender Name</label>
                        <input
                          type="text"
                          value={editedInvoice.senderName || ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, senderName: e.target.value })}
                          className="crm-input text-xs font-black text-[var(--primary-gold)]"
                          placeholder="Sender / Company Name"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Tagline / Department</label>
                        <input
                          type="text"
                          value={editedInvoice.senderTagline || ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, senderTagline: e.target.value })}
                          className="crm-input text-xs"
                          placeholder="Sender Tagline / Address"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Physical Address</label>
                        <input
                          type="text"
                          value={editedInvoice.senderAddress || ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, senderAddress: e.target.value })}
                          className="crm-input text-xs"
                          placeholder="Full Address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Email</label>
                          <input
                            type="text"
                            value={editedInvoice.senderEmail || ''}
                            onChange={(e) => setEditedInvoice({ ...editedInvoice, senderEmail: e.target.value })}
                            className="crm-input text-xs"
                            placeholder="Email"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Website</label>
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
                  </div>
                </div>
              )}

              {/* CONTENT & ITEMS TAB */}
              {modalTab === 'content' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[var(--border-color)]">
                    <div className="flex flex-col items-start gap-3 w-full sm:w-1/2">
                      <Logo variant="invoice" size="lg" className="mb-1" />
                      <div className="w-full space-y-2">
                        <div className="text-xs font-black text-[var(--primary-gold)]">{editedInvoice.senderName || 'AURRUM SERVICES'}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{editedInvoice.senderTagline || 'Talent Insights & Recruitment'}</div>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
                      <span className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Placement Fee Calculator (Annual Package / CTC)</span>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editedInvoice.calculatePlacementFee ?? true}
                          onChange={(e) => {
                            const isCalcOn = e.target.checked;
                            const ctcVal = editedInvoice.calcCtc ?? 60000;
                            const feePct = editedInvoice.calcFeePercent ?? 15;
                            const calculatedFee = isCalcOn ? Math.round(ctcVal * (feePct / 100)) : 0;
                            const itemDesc = `Placement Fee (${feePct}% of $${ctcVal.toLocaleString()} Annual CTC)`;
                            const taxRate = Number(editedInvoice.taxRate || 0);
                            const discount = Number(editedInvoice.discountAmount || 0);
                            const taxAmt = Math.round(calculatedFee * (taxRate / 100));
                            const total = Math.max(0, calculatedFee + taxAmt - discount);
                            setEditedInvoice({
                              ...editedInvoice,
                              calculatePlacementFee: isCalcOn,
                              serviceDescription: itemDesc,
                              subtotal: calculatedFee,
                              totalAmount: total,
                              candidates: []
                            });
                          }}
                          className="w-4 h-4 rounded text-[var(--primary-gold)] focus:ring-[var(--primary-gold)] border-[var(--border-color)] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Calculate Placement Fee based on Annual Salary</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono font-bold">
                      <span>Fee Status: <span className={editedInvoice.calculatePlacementFee ?? true ? "text-emerald-500 font-extrabold" : "text-amber-500 font-extrabold"}>{editedInvoice.calculatePlacementFee ?? true ? "ACTIVE (Included)" : "INACTIVE (Excluded / $0)"}</span></span>
                      <span className="text-[var(--primary-gold)]">
                        Calculated Fee: (${(editedInvoice.calculatePlacementFee ?? true ? Math.round((editedInvoice.calcCtc ?? 60000) * ((editedInvoice.calcFeePercent ?? 15) / 100)) : 0).toLocaleString()})
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
                            const isCalcOn = editedInvoice.calculatePlacementFee ?? true;
                            const calculatedFee = isCalcOn ? Math.round(newCtc * (feePct / 100)) : 0;
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
                            const isCalcOn = editedInvoice.calculatePlacementFee ?? true;
                            const calculatedFee = isCalcOn ? Math.round(ctcVal * (newPct / 100)) : 0;
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

                  {/* Single Placement Fee Line Item */}
                  <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xs">
                    <div className="bg-[var(--bg-primary)] px-4 py-2 border-b border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Placement Fee Line Item</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Single consolidated service fee</span>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-[#004564] text-white text-[10px] font-black uppercase tracking-wider">
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
                              value={getEffectiveSubtotal(editedInvoice)}
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
                          const sub = getEffectiveSubtotal(editedInvoice);
                          const tax = Math.round(sub * ((Number(editedInvoice.taxRate) || 0) / 100));
                          const disc = Number(editedInvoice.discountAmount) || 0;
                          const total = getEffectiveTotal(editedInvoice);
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
              )}

              {/* BANK & PAYMENT TAB */}
              {modalTab === 'bank' && (
                <div className="space-y-6 animate-in fade-in">
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
                </div>
              )}

              {/* SIGNATORY & FOOTER TAB */}
              {modalTab === 'signatory' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                    <h3 className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Signatory Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] block mb-1">Signatory Name</label>
                        <input
                          type="text"
                          value={editedInvoice.signatoryName || ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, signatoryName: e.target.value })}
                          className="crm-input text-xs font-bold"
                          placeholder="Signatory Name"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] block mb-1">Designation / Title</label>
                        <input
                          type="text"
                          value={editedInvoice.signatoryTitle || ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, signatoryTitle: e.target.value })}
                          className="crm-input text-xs"
                          placeholder="Designation"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-1">Upload Signature Image (From Computer)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (uploadEvent) => {
                              const base64Url = uploadEvent.target?.result as string;
                              if (base64Url) {
                                setEditedInvoice({ ...editedInvoice, signatureUrl: base64Url });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[var(--primary-gold)] file:text-white hover:file:opacity-90 cursor-pointer"
                      />
                      {editedInvoice.signatureUrl && (
                        <div className="flex items-center justify-between p-2 mt-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                          <div className="flex items-center gap-2">
                            <img src={editedInvoice.signatureUrl} alt="Signature Preview" className="h-8 max-w-[100px] object-contain rounded bg-white p-0.5 border" />
                            <span className="text-[10px] font-bold text-[var(--text-primary)]">Custom Signature Active</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditedInvoice({ ...editedInvoice, signatureUrl: '' })}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            Remove Signature
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Footer / Closing Statement editable */}
                  <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                    <label className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Invoice Footer Statements (Fully Editable):</label>
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
                </div>
              )}

              {/* LAYOUT & WATERMARK TAB */}
              {modalTab === 'layout' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] space-y-4">
                    <h3 className="text-xs font-black uppercase text-[var(--primary-gold)] tracking-wider">Watermark Customization</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Watermark Text</label>
                        <input
                          type="text"
                          value={editedInvoice.watermarkText !== undefined ? editedInvoice.watermarkText : 'AURRUM'}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, watermarkText: e.target.value })}
                          className="crm-input text-xs font-bold uppercase"
                          placeholder="AURRUM"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] block mb-1">Upload Watermark Image Background (From Computer)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const base64Url = uploadEvent.target?.result as string;
                                if (base64Url) {
                                  setEditedInvoice({ ...editedInvoice, watermarkUrl: base64Url });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[var(--primary-gold)] file:text-white hover:file:opacity-90 cursor-pointer"
                        />
                        {editedInvoice.watermarkUrl && (
                          <div className="flex items-center justify-between p-2 mt-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                            <div className="flex items-center gap-2">
                              <img src={editedInvoice.watermarkUrl} alt="Watermark Preview" className="w-8 h-8 object-contain rounded bg-white p-0.5 border" />
                              <span className="text-[10px] font-bold text-[var(--text-primary)]">Custom Watermark Image Active</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditedInvoice({ ...editedInvoice, watermarkUrl: '' })}
                              className="text-[10px] font-bold text-rose-500 hover:underline"
                            >
                              Remove Watermark Image
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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

