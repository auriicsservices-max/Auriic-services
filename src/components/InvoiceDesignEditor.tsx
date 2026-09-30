import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  Sliders, Save, RefreshCw, Eye, Download, Image, Layout, 
  CheckCircle2, AlertTriangle, FileText, Sparkles, Layers 
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceDesignConfig {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  headerSpacing: number;
  pageMargin: number;
  sectionSpacing: number;
  containerPadding: number;
  tableRowHeight: number;
  fontSize: number;
  lineHeight: number;
  borderThickness: number;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkPosition: 'center' | 'top-right' | 'bottom-right';
  signatureAlign: 'right' | 'left' | 'center';
  primaryColor: string;
  goldColor: string;
  textColor: string;
  borderColor: string;
  tableHeaderBg: string;
  textAlign: 'left' | 'center';
}

export const defaultInvoiceDesign: InvoiceDesignConfig = {
  logoUrl: 'https://aurrum.co/wp-content/uploads/2026/04/Aurrum_Logo-2.png',
  logoWidth: 160,
  logoHeight: 52,
  headerSpacing: 20,
  pageMargin: 40,
  sectionSpacing: 24,
  containerPadding: 40,
  tableRowHeight: 44,
  fontSize: 12,
  lineHeight: 1.5,
  borderThickness: 1,
  watermarkSize: 300,
  watermarkOpacity: 0.035,
  watermarkPosition: 'center',
  signatureAlign: 'right',
  primaryColor: '#004564',
  goldColor: '#A98B56',
  textColor: '#002D38',
  borderColor: '#cbd5e1',
  tableHeaderBg: '#004564',
  textAlign: 'left',
};

export const loadInvoiceDesign = async (): Promise<InvoiceDesignConfig> => {
  try {
    const cached = localStorage.getItem('aurrum_invoice_design');
    if (cached) {
      return { ...defaultInvoiceDesign, ...JSON.parse(cached) };
    }
    const docSnap = await getDoc(doc(db, 'settings', 'invoiceDesign'));
    if (docSnap.exists()) {
      const data = docSnap.data() as InvoiceDesignConfig;
      localStorage.setItem('aurrum_invoice_design', JSON.stringify(data));
      return { ...defaultInvoiceDesign, ...data };
    }
  } catch (e) {
    console.error('Error loading invoice design:', e);
  }
  return defaultInvoiceDesign;
};

export const InvoiceDesignEditor: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'team_leader' || role === 'developer';
  
  const [config, setConfig] = useState<InvoiceDesignConfig>(defaultInvoiceDesign);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadInvoiceDesign().then(loaded => setConfig(loaded));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      localStorage.setItem('aurrum_invoice_design', JSON.stringify(config));
      try {
        await setDoc(doc(db, 'settings', 'invoiceDesign'), config, { merge: true });
      } catch (firestoreErr) {
        console.warn('Firestore sync warning for invoice design (local storage saved successfully):', firestoreErr);
      }
      setMessage({ type: 'success', text: 'Invoice PDF design settings saved successfully!' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      console.error('Error saving invoice design:', err);
      setMessage({ type: 'error', text: 'Failed to save design settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultInvoiceDesign);
    setMessage({ type: 'success', text: 'Reset to default Aurrum corporate design.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleGenerateTestPdf = async () => {
    if (!previewRef) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(previewRef, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Aurrum_Invoice_Preview_${Date.now()}.pdf`);
      setMessage({ type: 'success', text: 'Test PDF generated and downloaded successfully!' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setMessage({ type: 'error', text: 'Failed to generate PDF.' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const sampleInvoice = {
    invoiceNumber: 'INV-2026-6330',
    invoiceDate: '16/09/2026',
    dueDate: '30/09/2026',
    status: 'Issued',
    clientName: 'Global Career Networks Limited',
    clientAddress: '30 Victoria Terrace, Ilkley LS20 9NF\nAttn: Accounts Payable',
    serviceDescription: 'Professional Recruitment & Talent Search Services',
    items: [
      { id: '1', description: 'Alice Huff | Senior Full-Stack Engineer Placement Fee', amount: 3417.60 }
    ],
    subtotal: 3417.60,
    taxRate: 0,
    taxAmount: 0,
    total: 3417.60,
    payeeName: 'Aurrum Services',
    bankName: 'Union Bank of India',
    bankBranch: 'Premchandnagar, Ahmedabad',
    accountNumber: '60680 10100 50648',
    swiftCode: 'UBININBBAHM',
    signatoryName: 'Mayur Jungi',
    signatoryTitle: 'Operations Manager'
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
            <Sliders size={24} className="text-[var(--primary-gold)]" /> Custom Invoice Editor & PDF Layout Settings
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
            Configure A4 margins, spacing, logo dimensions, watermark opacity, typography, and table styling for all outgoing corporate invoices without editing code.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="crm-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} /> Reset Defaults
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="crm-btn-gold px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md hover:scale-105 transition-all"
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Design Settings'}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold animate-in fade-in ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Layout Grid: Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Logo & Branding */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xs">
            <h3 className="text-sm font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-wider">
              <Image size={16} className="text-[var(--primary-gold)]" /> Logo & Dimensions
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Header Logo URL</label>
                <input 
                  type="text" 
                  value={config.logoUrl} 
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                  className="crm-input w-full text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Logo Width: {config.logoWidth}px</label>
                  <input 
                    type="range" 
                    min="100" 
                    max="260" 
                    value={config.logoWidth} 
                    onChange={(e) => setConfig({ ...config, logoWidth: Number(e.target.value) })}
                    className="w-full accent-[var(--primary-gold)] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Logo Height: {config.logoHeight}px</label>
                  <input 
                    type="range" 
                    min="30" 
                    max="90" 
                    value={config.logoHeight} 
                    onChange={(e) => setConfig({ ...config, logoHeight: Number(e.target.value) })}
                    className="w-full accent-[var(--primary-gold)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Spacing & Margins */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xs">
            <h3 className="text-sm font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-wider">
              <Layout size={16} className="text-[var(--primary-gold)]" /> Spacing & Margins
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Page Margin / Padding: {config.containerPadding}px</label>
                <input 
                  type="range" 
                  min="20" 
                  max="60" 
                  value={config.containerPadding} 
                  onChange={(e) => setConfig({ ...config, containerPadding: Number(e.target.value) })}
                  className="w-full accent-[var(--primary-gold)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Header Spacing: {config.headerSpacing}px</label>
                <input 
                  type="range" 
                  min="10" 
                  max="40" 
                  value={config.headerSpacing} 
                  onChange={(e) => setConfig({ ...config, headerSpacing: Number(e.target.value) })}
                  className="w-full accent-[var(--primary-gold)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Section Spacing: {config.sectionSpacing}px</label>
                <input 
                  type="range" 
                  min="12" 
                  max="40" 
                  value={config.sectionSpacing} 
                  onChange={(e) => setConfig({ ...config, sectionSpacing: Number(e.target.value) })}
                  className="w-full accent-[var(--primary-gold)] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Watermark Settings */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xs">
            <h3 className="text-sm font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-wider">
              <Sparkles size={16} className="text-[var(--primary-gold)]" /> Background Watermark
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Watermark Opacity: {Math.round(config.watermarkOpacity * 100)}%</label>
                <input 
                  type="range" 
                  min="0.01" 
                  max="0.1" 
                  step="0.005" 
                  value={config.watermarkOpacity} 
                  onChange={(e) => setConfig({ ...config, watermarkOpacity: Number(e.target.value) })}
                  className="w-full accent-[var(--primary-gold)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Watermark Size: {config.watermarkSize}px</label>
                <input 
                  type="range" 
                  min="180" 
                  max="450" 
                  value={config.watermarkSize} 
                  onChange={(e) => setConfig({ ...config, watermarkSize: Number(e.target.value) })}
                  className="w-full accent-[var(--primary-gold)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Watermark Position</label>
                <select 
                  value={config.watermarkPosition} 
                  onChange={(e) => setConfig({ ...config, watermarkPosition: e.target.value as any })}
                  className="crm-input w-full text-xs font-bold"
                >
                  <option value="center">Centered</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Typography & Tables */}
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xs">
            <h3 className="text-sm font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-wider">
              <Layers size={16} className="text-[var(--primary-gold)]" /> Typography & Table Rows
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Base Font Size: {config.fontSize}px</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="15" 
                    value={config.fontSize} 
                    onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                    className="w-full accent-[var(--primary-gold)] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Table Row Height: {config.tableRowHeight}px</label>
                  <input 
                    type="range" 
                    min="32" 
                    max="64" 
                    value={config.tableRowHeight} 
                    onChange={(e) => setConfig({ ...config, tableRowHeight: Number(e.target.value) })}
                    className="w-full accent-[var(--primary-gold)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={config.primaryColor} 
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value, tableHeaderBg: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input 
                      type="text" 
                      value={config.primaryColor} 
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value, tableHeaderBg: e.target.value })}
                      className="crm-input font-mono text-xs uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Gold Accent</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={config.goldColor} 
                      onChange={(e) => setConfig({ ...config, goldColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input 
                      type="text" 
                      value={config.goldColor} 
                      onChange={(e) => setConfig({ ...config, goldColor: e.target.value })}
                      className="crm-input font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Live Preview Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between shadow-2xs">
            <span className="text-xs font-black uppercase text-[var(--text-primary)] flex items-center gap-2 tracking-wider">
              <Eye size={16} className="text-[var(--primary-gold)]" /> Live A4 PDF Layout Preview
            </span>
            <button
              type="button"
              onClick={handleGenerateTestPdf}
              disabled={isGeneratingPdf}
              className="crm-btn-gold px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Download size={14} /> {isGeneratingPdf ? 'Generating PDF...' : 'Generate Test PDF'}
            </button>
          </div>

          {/* Scaled A4 Preview Container */}
          <div className="bg-slate-200 dark:bg-slate-900 p-4 sm:p-8 rounded-2xl overflow-x-auto flex justify-center border border-[var(--border-color)]">
            <div 
              ref={setPreviewRef}
              style={{ 
                width: '794px', 
                minHeight: '1123px', 
                backgroundColor: '#ffffff', 
                color: config.textColor,
                padding: `${config.containerPadding}px`,
                fontSize: `${config.fontSize}px`,
                lineHeight: config.lineHeight,
                position: 'relative',
                boxSizing: 'border-box',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              className="font-sans overflow-hidden select-none"
            >
              {/* Watermark Logo */}
              <div style={{
                position: 'absolute',
                top: config.watermarkPosition === 'top-right' ? '40px' : config.watermarkPosition === 'bottom-right' ? 'auto' : '50%',
                bottom: config.watermarkPosition === 'bottom-right' ? '40px' : 'auto',
                left: config.watermarkPosition === 'center' ? '50%' : 'auto',
                right: config.watermarkPosition !== 'center' ? '40px' : 'auto',
                transform: config.watermarkPosition === 'center' ? 'translate(-50%, -50%)' : 'none',
                opacity: config.watermarkOpacity,
                pointerEvents: 'none',
                zIndex: 0,
                textAlign: 'center'
              }}>
                <img 
                  src={config.logoUrl} 
                  alt="Watermark" 
                  style={{ width: `${config.watermarkSize}px`, height: 'auto', filter: 'grayscale(100%)' }}
                  crossOrigin="anonymous"
                />
              </div>

              {/* Content Wrapper */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: `${config.sectionSpacing}px` }}>
                
                {/* Header Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  borderBottom: `2px solid ${config.primaryColor}`, 
                  paddingBottom: `${config.headerSpacing}px` 
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <img 
                      src={config.logoUrl} 
                      alt="Logo" 
                      style={{ width: `${config.logoWidth}px`, height: `${config.logoHeight}px`, objectFit: 'contain' }} 
                      crossOrigin="anonymous"
                    />
                    <div>
                      <p style={{ margin: '2px 0 0 0', color: config.primaryColor, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Talent Insights & Recruitment Services
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '10px', maxWidth: '280px', lineHeight: '1.4' }}>
                        513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015
                      </p>
                      <p style={{ margin: '4px 0 0 0', color: config.goldColor, fontSize: '11px', fontWeight: 700 }}>+91 90339 11174</p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: `1px solid ${config.borderColor}`, minWidth: '210px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 900, color: config.textColor, margin: 0 }}>INVOICE</h2>
                      <span style={{ padding: '2px 8px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase', fontSize: '9px' }}>
                        {sampleInvoice.status}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}><strong style={{ color: '#64748b' }}>Invoice No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{sampleInvoice.invoiceNumber}</span></p>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}><strong style={{ color: '#64748b' }}>Issue Date:</strong> {sampleInvoice.invoiceDate}</p>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}><strong style={{ color: '#64748b' }}>Due Date:</strong> {sampleInvoice.dueDate}</p>
                  </div>
                </div>

                {/* Billed To & Service Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: `1px solid ${config.borderColor}`, borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
                  <div>
                    <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: config.goldColor, marginBottom: '6px', letterSpacing: '0.05em' }}>Billed To</h3>
                    <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 800, color: config.textColor }}>{sampleInvoice.clientName}</p>
                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#475569', whiteSpace: 'pre-wrap' }}>{sampleInvoice.clientAddress}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: config.goldColor, marginBottom: '6px', letterSpacing: '0.05em' }}>Service Description</h3>
                    <p style={{ margin: '2px 0', fontSize: '11px', fontWeight: 700, color: config.textColor }}>{sampleInvoice.serviceDescription}</p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div style={{ border: `1px solid ${config.borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: config.tableHeaderBg, color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}>Description</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', textAlign: 'right', width: '150px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody style={{ background: '#ffffff' }}>
                      <tr style={{ borderBottom: `1px solid ${config.borderColor}`, height: `${config.tableRowHeight}px` }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: config.textColor }}>{sampleInvoice.items[0].description}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: config.textColor }}>
                          $ {sampleInvoice.items[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ width: '280px', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0', color: '#64748b', fontWeight: 700 }}>Subtotal:</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, padding: '6px 0', color: config.textColor }}>$3,417.60</td>
                      </tr>
                      <tr style={{ borderTop: `2px solid ${config.goldColor}`, backgroundColor: '#f1f5f9', fontWeight: 900 }}>
                        <td style={{ padding: '10px 8px', textTransform: 'uppercase', fontSize: '11px', color: config.textColor }}>Total Due:</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '10px 8px', color: config.goldColor, fontSize: '14px' }}>$3,417.60</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bank Instructions & Signatory */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${config.borderColor}` }}>
                  <div style={{ width: '50%' }}>
                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: `1px solid ${config.borderColor}`, borderRadius: '8px', fontSize: '11px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: config.primaryColor, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Bank Payment Instructions</strong>
                      <p style={{ margin: '2px 0', color: '#334155' }}><strong>Payee Name:</strong> {sampleInvoice.payeeName}</p>
                      <p style={{ margin: '2px 0', color: '#334155' }}><strong>Bank Name:</strong> {sampleInvoice.bankName}</p>
                      <p style={{ margin: '2px 0', color: '#334155' }}><strong>Account:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{sampleInvoice.accountNumber}</span></p>
                    </div>
                  </div>

                  <div style={{ textAlign: config.signatureAlign }}>
                    <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '24px', color: config.goldColor, fontWeight: 'bold', marginBottom: '2px' }}>
                      {sampleInvoice.signatoryName}
                    </div>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: '13px', color: config.textColor }}>{sampleInvoice.signatoryName}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sampleInvoice.signatoryTitle}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: config.goldColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Aurrum Services</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
