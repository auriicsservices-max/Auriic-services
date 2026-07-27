import React from 'react';
import { Invoice } from '../types';
import Logo from './Logo';

export const InvoicePreview = React.forwardRef<HTMLDivElement, { invoice: Invoice, logoUrl: string }>(({ invoice, logoUrl }, ref) => {
  return (
    <div 
      ref={ref} 
      className="p-8 sm:p-12 bg-[var(--card-bg)] text-[var(--text-primary)] max-w-4xl mx-auto border border-[var(--border-color)] rounded-[24px] shadow-sm transition-all duration-300 font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-3">
          <Logo variant="invoice" size="lg" className="mb-1" />
          <div>
            <p className="font-extrabold text-xl tracking-tight text-[var(--text-primary)]">Aurrum Services</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-md leading-relaxed">
              513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej - Gandhinagar Hwy, Ahmedabad - 380015
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1 font-semibold">+91 90339 11174</p>
          </div>
        </div>
        <div className="text-left sm:text-right text-sm space-y-1.5 shrink-0 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] min-w-[220px]">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary-gold)] mb-1">Invoice Info</p>
          <p><span className="font-bold text-[var(--text-secondary)]">Invoice No:</span> <span className="font-mono font-semibold">{invoice.invoiceNumber}</span></p>
          <p><span className="font-bold text-[var(--text-secondary)]">Invoice Date:</span> <span className="font-semibold">{invoice.invoiceDate}</span></p>
          <p><span className="font-bold text-[var(--text-secondary)]">Due Date:</span> <span className="font-semibold">{invoice.dueDate}</span></p>
        </div>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-[var(--border-color)] rounded-2xl overflow-hidden mb-8 bg-[var(--bg-primary)] shadow-2xs">
        <div className="p-5 border-b sm:border-b-0 sm:border-r border-[var(--border-color)]">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary-gold)] mb-2">Billed To</p>
          <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">{invoice.clientName}</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{invoice.clientAddress}</p>
        </div>
        <div className="p-5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary-gold)] mb-2">Service Description</p>
          <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">{invoice.serviceDescription}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden mb-8 shadow-2xs">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-b border-[var(--border-color)] text-left">
            <tr>
              <th className="py-3 px-5 font-bold uppercase tracking-wider text-xs">Description</th>
              <th className="py-3 px-5 font-bold uppercase tracking-wider text-xs text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] bg-[var(--card-bg)]">
            {invoice.items.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--card-hover-bg)] transition-colors">
                <td className="py-3 px-5 text-[var(--text-primary)] font-medium">{item.description}</td>
                <td className="py-3 px-5 text-right font-mono font-semibold text-[var(--text-primary)]">£ {item.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-[var(--bg-primary)] font-medium">
              <td className="py-3 px-5 text-right text-[var(--text-secondary)]">Tax (n/a):</td>
              <td className="py-3 px-5 text-right font-mono text-[var(--text-secondary)]">—</td>
            </tr>
            <tr className="bg-[var(--bg-secondary)]/50 border-t-2 border-[var(--primary-gold)]/40 font-bold text-base">
              <td className="py-4 px-5 text-right text-[var(--text-primary)]">Total Due:</td>
              <td className="py-4 px-5 text-right font-mono text-[var(--primary-gold)] text-lg">£ {invoice.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-sm space-y-6 pt-6 border-t border-[var(--border-color)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--primary-gold)] mb-3">Payment Instructions</h4>
            <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] space-y-1.5">
              <p className="text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">Payable To:</span> {invoice.payeeName}</p>
              <div className="h-px bg-[var(--border-subtle)] my-1"></div>
              <p className="text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">Bank Name:</span> {invoice.bankName}</p>
              <p className="text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">Branch:</span> {invoice.bankBranch}</p>
              <p className="text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">Account No:</span> <span className="font-mono font-semibold">{invoice.accountNumber}</span></p>
              <p className="text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">Swift Code:</span> <span className="font-mono font-semibold">{invoice.swiftCode}</span></p>
            </div>
          </div>
          
          <div className="flex flex-col justify-end items-start sm:items-end text-left sm:text-right space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Authorized Signatory</p>
            <p className="font-black text-lg text-[var(--text-primary)] mt-1">{invoice.signatoryName}</p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">{invoice.signatoryTitle || 'Operations Manager'}</p>
            <div className="w-32 h-0.5 bg-[var(--primary-gold)]/40 mt-4 self-start sm:self-end"></div>
          </div>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = 'InvoicePreview';
