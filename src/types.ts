export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  serviceDescription: string;
  items: InvoiceItem[];
  tax: number;
  total: number;
  payeeName: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  swiftCode: string;
  signatoryName: string;
  signatoryTitle: string;
  status: 'draft' | 'finalized';
  candidateId?: string;
  senderName?: string;
  senderTagline?: string;
  senderEmail?: string;
  senderWeb?: string;
}
