import React from 'react';
import { Invoice } from '../types';

export const InvoicePreview = React.forwardRef<HTMLDivElement, { invoice: Invoice, logoUrl: string }>(({ invoice, logoUrl }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-[#004564] max-w-4xl mx-auto border border-slate-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src={logoUrl} alt="Company Logo" className="h-16 mb-2" />
          <p className="font-bold">Aurrum Services</p>
          <p className="text-sm">513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej</p>
          <p className="text-sm">- Gandhinagar Hwy, Ahmedabad- 380015</p>
          <p className="text-sm">+91 90339 11174</p>
        </div>
        <div className="text-right text-sm">
          <p><span className="font-bold">Invoice No:</span> {invoice.invoiceNumber}</p>
          <p><span className="font-bold">Invoice Date:</span> {invoice.invoiceDate}</p>
          <p><span className="font-bold">Due Date:</span> {invoice.dueDate}</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-slate-400 p-4">
          <h3 className="font-bold mb-2">To: {invoice.clientName}</h3>
          <p className="text-sm">{invoice.clientAddress}</p>
        </div>
        <div className="border border-slate-400 p-4">
          <h3 className="font-bold mb-2">Service Description:</h3>
          <p className="text-sm">{invoice.serviceDescription}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full mb-8">
        <thead className="bg-[#004564] text-white">
          <tr>
            <th className="py-2 px-4 text-left">Description</th>
            <th className="py-2 px-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="border border-slate-400">
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-slate-400">
              <td className="py-2 px-4">{item.description}</td>
              <td className="py-2 px-4 text-right">£ {item.amount.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-b border-slate-400">
            <td className="py-2 px-4 font-bold text-right">Tax:</td>
            <td className="py-2 px-4 text-right">n/a</td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-bold text-right">Total:</td>
            <td className="py-2 px-4 text-right font-bold">£ {invoice.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="text-sm">
        <h3 className="font-bold mb-2">Make all payable to:</h3>
        <p className="font-bold">Customer Name: {invoice.payeeName}</p>
        
        <div className="mt-4">
          <h3 className="font-bold mb-1">Bank Details</h3>
          <div className="grid grid-cols-4 gap-2">
            <span className="font-bold">Bank Name</span> <span>: {invoice.bankName}</span>
            <span className="font-bold">Branch</span> <span>: {invoice.bankBranch}</span>
            <span className="font-bold">Account Number</span> <span>: {invoice.accountNumber}</span>
            <span className="font-bold">Swift Code</span> <span>: {invoice.swiftCode}</span>
          </div>
        </div>
        
        <div className="text-right mt-8">
          <p className="font-bold">Operations Manager</p>
          <p className="font-bold">{invoice.signatoryName}</p>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = 'InvoicePreview';
