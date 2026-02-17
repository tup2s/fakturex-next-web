import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import InvoiceList from '../components/Invoice/InvoiceList';
import InvoiceForm from '../components/Invoice/InvoiceForm';
import { fetchInvoices } from '../services/api';

const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        const loadInvoices = async () => {
            const data = await fetchInvoices();
            setInvoices(data);
        };
        loadInvoices();
    }, []);

    const handleSelectInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
    };

    const handleFormClose = () => {
        setSelectedInvoice(null);
    };

    return (
        <div>
            <h1>Invoices</h1>
            <InvoiceList invoices={invoices} onSelect={handleSelectInvoice} />
            <InvoiceForm invoice={selectedInvoice} onClose={handleFormClose} />
        </div>
    );
};

export default Invoices;