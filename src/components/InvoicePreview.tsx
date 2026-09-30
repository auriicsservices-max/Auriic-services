import React from 'react';
import { Invoice } from '../types';
import Logo from './Logo';

export const InvoicePreview = React.forwardRef<HTMLDivElement, { invoice: Invoice, logoUrl?: string }>(({ invoice, logoUrl: propLogoUrl }, ref) => {
  const invAny = invoice as any;
  const computedSub = (invAny.subtotal !== undefined && invAny.subtotal !== null && !isNaN(invAny.subtotal) && Number(invAny.subtotal) > 0)
    ? Number(invAny.subtotal)
    : (invAny.candidates && invAny.candidates.length > 0
        ? invAny.candidates.reduce((sum: any, c: any) => sum + Number(c.fee || c.amount || 0), 0)
        : (invAny.items && invAny.items.length > 0 ? invAny.items.reduce((acc: any, item: any) => acc + item.amount, 0) : Number(invAny.totalAmount || invAny.total || 0)));

  const subtotal = computedSub;
  const total = (invAny.totalAmount !== undefined && invAny.totalAmount !== null && !isNaN(invAny.totalAmount) && Number(invAny.totalAmount) > 0)
    ? Number(invAny.totalAmount)
    : (invAny.total !== undefined && invAny.total !== null && !isNaN(invAny.total) && Number(invAny.total) > 0)
      ? Number(invAny.total)
      : Math.max(0, subtotal + (invAny.tax || invAny.taxAmount || 0) - (invAny.discountAmount || 0));

  const logoVariant = invoice.logoVariant || 'dark';
  const darkLogo = invoice.darkLogoUrl || propLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-Logo.svg';
  const whiteLogo = invoice.whiteLogoUrl || 'https://aurrum.co/wp-content/uploads/2026/05/Rectech-white-logo.svg';
  
  const displayLogoUrl = logoVariant === 'white' 
    ? whiteLogo 
    : (logoVariant === 'custom' && invoice.logoUrl ? invoice.logoUrl : darkLogo);

  const activeWatermarkUrl = invoice.watermarkUrl || displayLogoUrl;

  const cleanSignatoryName = (!invoice.signatoryName || invoice.signatoryName.includes('dfgvdsf') || invoice.signatoryName.includes('gvsdfesf')) ? 'Mayur Jungi' : invoice.signatoryName;
  const cleanSignatoryTitle = (!invoice.signatoryTitle || invoice.signatoryTitle.includes('dfgvdsf') || invoice.signatoryTitle.includes('gvsdfesf')) ? 'Operations Manager' : invoice.signatoryTitle;

  return (
    <div 
      ref={ref} 
      style={{ width: '794px', height: '1123px', boxSizing: 'border-box' }}
      className="relative overflow-hidden p-[40px] bg-white text-[#002D38] mx-auto shadow-2xl font-sans flex flex-col justify-between"
    >
      {/* Centered Background Watermark Image or Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        {invoice.watermarkUrl ? (
          <img 
            src={invoice.watermarkUrl} 
            alt="Watermark Logo" 
            className="w-[340px] h-[340px] object-contain opacity-[0.05]"
            crossOrigin="anonymous"
          />
        ) : invoice.watermarkText ? (
          <div className="font-black text-6xl uppercase tracking-widest text-[#002D38] opacity-[0.04] rotate-[-25deg] select-none">
            {invoice.watermarkText}
          </div>
        ) : (
          <img 
            src={displayLogoUrl} 
            alt="Watermark Logo" 
            className="w-[340px] h-[340px] object-contain opacity-[0.05]"
            crossOrigin="anonymous"
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col flex-1 justify-between">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-[#004564]">
            <div className="flex items-start gap-3">
              <img 
                src={displayLogoUrl} 
                alt="Logo" 
                className="h-12 w-12 object-contain shrink-0 p-1 bg-white border border-[#cbd5e1] rounded-xl"
                crossOrigin="anonymous"
              />
              <div>
                <h1 className="text-sm font-extrabold text-[#002D38] m-0">{invoice.senderName || 'AURRUM SERVICES'}</h1>
                <p className="text-[10px] text-[#005472] font-bold uppercase tracking-wider m-0">
                  {invoice.senderTagline || 'Talent Insights & Recruitment Services'}
                </p>
                <p className="text-[9px] text-[#64748b] mt-1 max-w-[260px] leading-snug">
                  {invoice.senderAddress || '513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015'}
                </p>
                <p className="text-[9px] text-[#A98B56] font-bold mt-1">{invoice.senderEmail || 'auriicsservices@gmail.com'} | {invoice.senderWeb || 'aurrum.co'}</p>
              </div>
            </div>

            {/* Invoice Info Box */}
            <div className="text-right text-xs space-y-1.5 shrink-0 bg-[#f8fafc] p-3 rounded-xl border border-[#cbd5e1] min-w-[190px]">
              <div className="flex justify-end items-center gap-2 mb-1">
                <h2 className="text-base font-black text-[#002D38] m-0 tracking-tight">INVOICE</h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[9px] font-black uppercase">
                  {invoice.status || 'Draft'}
                </span>
              </div>
              <p className="m-0 text-[10px]"><span className="text-[#64748b] font-bold">Invoice No:</span> <span className="font-mono font-bold text-[#002D38]">{invoice.invoiceNumber || '633011'}</span></p>
              <p className="m-0 text-[10px]"><span className="text-[#64748b] font-bold">Issue Date:</span> <span className="font-semibold text-[#002D38]">{invoice.invoiceDate}</span></p>
              <p className="m-0 text-[10px]"><span className="text-[#64748b] font-bold">Due Date:</span> <span className="font-semibold text-[#002D38]">{invoice.dueDate}</span></p>
            </div>
          </div>

          {/* Boxed To & Service Description Section */}
          <div className="grid grid-cols-2 border border-[#cbd5e1] rounded-xl overflow-hidden bg-[#f8fafc] p-3 gap-4">
            <div>
              <p className="text-[9px] uppercase font-black tracking-widest text-[#A98B56] mb-1">Billed To :</p>
              <h3 className="font-black text-xs text-[#002D38] m-0">{invoice.clientName}</h3>
              {invoice.clientAddress && (
                <p className="text-[10px] text-[#002D38] leading-relaxed mt-1 whitespace-pre-wrap">{invoice.clientAddress}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-black tracking-widest text-[#A98B56] mb-1">Service Description:</p>
              <p className="text-[10px] text-[#002D38] font-bold leading-relaxed m-0">
                {invoice.serviceDescription || 'Professional Recruitment & Talent Search Services'}
              </p>
            </div>
          </div>

          {/* Styled Brand Table */}
          <div className="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[#004564] text-white text-left">
                <tr>
                  <th className="py-2.5 px-4 font-black uppercase tracking-wider text-[10px]">Description</th>
                  <th className="py-2.5 px-4 font-black uppercase tracking-wider text-[10px] text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cbd5e1] bg-white">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc]">
                    <td className="py-2.5 px-4 text-[#002D38] font-bold text-[11px]">{item.description}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#002D38] text-[11px]">
                      $ {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between text-[#64748b]">
                <span className="font-bold">Subtotal:</span>
                <span className="font-mono font-bold text-[#002D38]">$ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-[#64748b]">
                  <span className="font-bold">Tax:</span>
                  <span className="font-mono font-bold text-[#002D38]">+$ {invoice.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t-2 border-[#A98B56] bg-[#f1f5f9] p-2 rounded-lg text-[#002D38]">
                <span className="text-xs uppercase">Total Due:</span>
                <span className="font-mono text-[#A98B56]">$ {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Bank Details & Signatory */}
        <div className="pt-4 border-t border-[#cbd5e1] flex justify-between items-end gap-6 mt-4">
          <div className="space-y-2 w-1/2">
            {(invoice.payeeName || invoice.bankName || invoice.accountNumber) ? (
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#cbd5e1] space-y-1 text-[10px]">
                <p className="font-black uppercase text-[#004564] tracking-wider m-0">Bank Payment Instructions</p>
                {invoice.payeeName && <p className="m-0 text-[#334155]"><strong>Payee:</strong> {invoice.payeeName}</p>}
                {invoice.bankName && <p className="m-0 text-[#334155]"><strong>Bank:</strong> {invoice.bankName}</p>}
                {invoice.accountNumber && <p className="m-0 text-[#334155]"><strong>A/C:</strong> <span className="font-mono font-bold">{invoice.accountNumber}</span></p>}
                {invoice.swiftCode && <p className="m-0 text-[#334155]"><strong>SWIFT:</strong> <span className="font-mono font-bold">{invoice.swiftCode}</span></p>}
              </div>
            ) : (
              <div className="text-[10px] text-[#64748b]">
                <p className="font-bold text-[#002D38] m-0">Thank you for your business!</p>
                <p className="m-0">Please remit payment according to agreed terms.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end text-right space-y-0.5">
            {invoice.signatureUrl ? (
              <img 
                src={invoice.signatureUrl} 
                alt="Signature" 
                className="max-h-12 max-w-[160px] object-contain mb-1" 
                crossOrigin="anonymous" 
              />
            ) : (
              <div className="font-serif italic text-xl text-[#A98B56] font-black">
                {cleanSignatoryName}
              </div>
            )}
            <p className="font-black text-xs text-[#002D38] m-0">{cleanSignatoryName}</p>
            <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider m-0">{cleanSignatoryTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = 'InvoicePreview';

