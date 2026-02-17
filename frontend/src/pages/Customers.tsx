import React, { useEffect, useState } from 'react';
import { fetchCustomers } from '../services/api';
import CustomerList from '../components/Customer/CustomerList';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getCustomers = async () => {
            try {
                const data = await fetchCustomers();
                setCustomers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getCustomers();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Customers</h1>
            <CustomerList customers={customers} />
        </div>
    );
};

export default Customers;