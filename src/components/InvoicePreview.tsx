import React from 'react';
import { Invoice } from '../types';

export const InvoicePreview = React.forwardRef<HTMLDivElement, { invoice: Invoice, logoUrl: string }>(({ invoice, logoUrl }, ref) => {
  return (
    <div ref={ref} className="p-12 bg-white text-[#004564] max-w-4xl mx-auto border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src={logoUrl} alt="Company Logo" className="h-16 mb-4" />
          <p className="font-bold text-lg">Aurrum Services</p>
          <p className="text-sm">513, 5th Floor, Shivalik Shilp Iskcon Cross Road, Sarkhej</p>
          <p className="text-sm">- Gandhinagar Hwy, Ahmedabad- 380015</p>
          <p className="text-sm">+91 90339 11174</p>
        </div>
        <div className="text-right text-sm">
          <p className="mb-1"><span className="font-bold">Invoice No:</span> {invoice.invoiceNumber}</p>
          <p className="mb-1"><span className="font-bold">Invoice Date:</span> {invoice.invoiceDate}</p>
          <p className="mb-1"><span className="font-bold">Due Date:</span> {invoice.dueDate}</p>
        </div>
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-2 gap-0 border border-[#004564] mb-8">
        <div className="p-4 border-r border-[#004564]">
          <h3 className="font-bold mb-1">To: {invoice.clientName}</h3>
          <p className="text-sm">{invoice.clientAddress}</p>
        </div>
        <div className="p-4">
          <h3 className="font-bold mb-1">Service Description:</h3>
          <p className="text-sm">{invoice.serviceDescription}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full mb-8 border border-[#004564]">
        <thead className="bg-[#004564] text-white">
          <tr>
            <th className="py-2 px-4 text-left">Description</th>
            <th className="py-2 px-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-[#004564]">
              <td className="py-2 px-4">{item.description}</td>
              <td className="py-2 px-4 text-right">£ {item.amount.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="border-b border-[#004564]">
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
        <p className="font-bold mb-4">Customer Name: {invoice.payeeName}</p>
        
        <div className="mb-12">
          <h3 className="font-bold mb-2">Bank Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <p><span className="font-bold">Bank Name</span> : {invoice.bankName}</p>
            <p><span className="font-bold">Branch</span> : {invoice.bankBranch}</p>
            <p><span className="font-bold">Account Number</span> : {invoice.accountNumber}</p>
            <p><span className="font-bold">Swift Code</span> : {invoice.swiftCode}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-bold">Operations Manager</p>
          <p className="font-bold text-lg">{invoice.signatoryName}</p>
        </div>
      </div>
    </div>
  );
});
InvoicePreview.displayName = 'InvoicePreview';
