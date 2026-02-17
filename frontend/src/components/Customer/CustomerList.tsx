import React, { useEffect, useState } from 'react';
import { fetchCustomers } from '../../services/api';

const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const data = await fetchCustomers();
                setCustomers(data);
            } catch (err) {
                setError('Failed to load customers');
            } finally {
                setLoading(false);
            }
        };

        loadCustomers();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h2>Customer List</h2>
            <ul>
                {customers.map(customer => (
                    <li key={customer.id}>{customer.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default CustomerList;