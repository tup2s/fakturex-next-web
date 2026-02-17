import React, { useEffect, useState } from 'react';
import { Invoice } from '../../types';
import { fetchInvoices } from '../../services/api';

const InvoiceList: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInvoices = async () => {
            try {
                const data = await fetchInvoices();
                setInvoices(data);
            } catch (err) {
                setError('Failed to load invoices');
            } finally {
                setLoading(false);
            }
        };

        loadInvoices();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h2>Invoice List</h2>
            <ul>
                {invoices.map((invoice) => (
                    <li key={invoice.id}>
                        <h3>Invoice #{invoice.id}</h3>
                        <p>Customer: {invoice.customerName}</p>
                        <p>Total: ${invoice.total}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default InvoiceList;