import React from 'react';
import { Invoice } from '../types';
import Logo from './Logo';

export const InvoicePreview = React.forwardRef<HTMLDivElement, { invoice: Invoice, logoUrl: string }>(({ invoice, logoUrl }, ref) => {
  return (
    <div 
      ref={ref} 
      className="p-8 sm:p-12 bg-[var(--card-bg)] text-[var(--text-primary)] max-w-4xl mx-auto border border-[var(--border-color)] rounded-[24px] shadow-md transition-all duration-300 font-sans space-y-8"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-3">
          <Logo variant="invoice" size="lg" className="mb-1" />
          <div>
            <p className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">
              {invoice.senderName || 'Aurrum Services'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md leading-relaxed">
              513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015
            </p>
            <p className="text-xs text-[var(--primary-gold)] font-bold mt-1.5">+91 90339 11174</p>
          </div>
        </div>

        {/* Invoice Info Box */}
        <div className="text-left sm:text-right text-xs space-y-2 shrink-0 bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)] min-w-[220px]">
          <p className="text-[10px] uppercase font-black tracking-widest text-[var(--primary-gold)] mb-1">Invoice Details</p>
          <p><span className="font-bold text-[var(--text-muted)]">Invoice No:</span> <span className="font-mono font-bold text-[var(--text-primary)] ml-1">{invoice.invoiceNumber || '633011'}</span></p>
          <p><span className="font-bold text-[var(--text-muted)]">Invoice Date:</span> <span className="font-semibold text-[var(--text-primary)] ml-1">{invoice.invoiceDate}</span></p>
          <p><span className="font-bold text-[var(--text-muted)]">Due Date:</span> <span className="font-semibold text-[var(--text-primary)] ml-1">{invoice.dueDate}</span></p>
        </div>
      </div>

      {/* Boxed To & Service Description Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-primary)] shadow-2xs">
        <div className="p-5 border-b sm:border-b-0 sm:border-r border-[var(--border-color)] space-y-1.5">
          <p className="text-[10px] uppercase font-black tracking-widest text-[var(--primary-gold)] mb-2">To :</p>
          <h3 className="font-black text-base text-[var(--text-primary)]">{invoice.clientName}</h3>
          {invoice.clientAddress && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{invoice.clientAddress}</p>
          )}
        </div>
        <div className="p-5 space-y-1.5 bg-[var(--card-bg)]/40">
          <p className="text-[10px] uppercase font-black tracking-widest text-[var(--primary-gold)] mb-2">Service Description:</p>
          <p className="text-xs text-[var(--text-primary)] font-bold leading-relaxed">
            {invoice.serviceDescription || 'Recruitment services'}
          </p>
        </div>
      </div>

      {/* Styled Brand Table */}
      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-xs">
          <thead className="bg-[#004564] dark:bg-[#002D38] text-white border-b border-[var(--border-color)] text-left">
            <tr>
              <th className="py-3.5 px-5 font-bold uppercase tracking-wider text-[11px]">Description</th>
              <th className="py-3.5 px-5 font-bold uppercase tracking-wider text-[11px] text-right w-40">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] bg-[var(--card-bg)]">
            {invoice.items.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--card-hover-bg)] transition-colors">
                <td className="py-3.5 px-5 text-[var(--text-primary)] font-bold">{item.description}</td>
                <td className="py-3.5 px-5 text-right font-mono font-bold text-[var(--text-primary)] text-sm">
                  £ {item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-[var(--bg-primary)] font-medium">
              <td className="py-3 px-5 text-right text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-wider">Tax:</td>
              <td className="py-3 px-5 text-right font-mono text-[var(--text-secondary)]">n/a</td>
            </tr>
            <tr className="bg-[var(--bg-secondary)] border-t-2 border-[var(--primary-gold)]/50 font-black text-sm">
              <td className="py-4 px-5 text-right text-[var(--text-primary)] uppercase tracking-wider text-xs">Total:</td>
              <td className="py-4 px-5 text-right font-mono text-[var(--primary-gold)] text-base">
                £ {invoice.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer / Bank Details & Signatory */}
      <div className="pt-6 border-t border-[var(--border-color)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
          {/* Bank Instructions */}
          <div className="space-y-3">
            {(invoice.payeeName || invoice.bankName || invoice.accountNumber) && (
              <>
                <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                  Make all payable to:
                </p>
                {invoice.payeeName && (
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Customer Name : <span className="font-normal text-[var(--text-secondary)]">{invoice.payeeName}</span>
                  </p>
                )}

                <div className="pt-2 space-y-1">
                  <p className="text-[11px] font-black uppercase text-[var(--primary-gold)] tracking-wider">Bank Details</p>
                  {invoice.bankName && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Bank Name :</strong> {invoice.bankName}
                    </p>
                  )}
                  {invoice.bankBranch && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Branch :</strong> {invoice.bankBranch}
                    </p>
                  )}
                  {invoice.accountNumber && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Account Number :</strong> <span className="font-mono font-bold text-[var(--text-primary)]">{invoice.accountNumber}</span>
                    </p>
                  )}
                  {invoice.swiftCode && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Swift Code :</strong> <span className="font-mono font-bold text-[var(--text-primary)]">{invoice.swiftCode}</span>
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Signatory Block */}
          <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1">
            <div className="font-serif italic text-2xl text-[var(--primary-gold)] tracking-tight font-black select-none">
              {invoice.signatoryName || 'Mayur Jungi'}
            </div>
            <p className="font-black text-sm text-[var(--text-primary)]">{invoice.signatoryName || 'Mayur Jungi'}</p>
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">{invoice.signatoryTitle || 'Operations Manager'}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = 'InvoicePreview';
