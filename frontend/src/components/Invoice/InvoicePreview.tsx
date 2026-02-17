import React from 'react';

interface InvoicePreviewProps {
  invoice: {
    id: string;
    customerName: string;
    date: string;
    items: Array<{
      description: string;
      quantity: number;
      price: number;
    }>;
    total: number;
  };
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
  return (
    <div className="invoice-preview">
      <h2>Invoice #{invoice.id}</h2>
      <p>Customer: {invoice.customerName}</p>
      <p>Date: {invoice.date}</p>
      <h3>Items</h3>
      <ul>
        {invoice.items.map((item, index) => (
          <li key={index}>
            {item.description} - {item.quantity} x ${item.price.toFixed(2)}
          </li>
        ))}
      </ul>
      <h3>Total: ${invoice.total.toFixed(2)}</h3>
    </div>
  );
};

export default InvoicePreview;