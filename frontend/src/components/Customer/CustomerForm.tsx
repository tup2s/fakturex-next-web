import React, { useState } from 'react';

const CustomerForm = () => {
    const [customerData, setCustomerData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomerData({
            ...customerData,
            [name]: value,
        });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Add logic to handle form submission, e.g., API call to save customer data
        console.log('Customer data submitted:', customerData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Name:</label>
                <input
                    type="text"
                    name="name"
                    value={customerData.name}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Email:</label>
                <input
                    type="email"
                    name="email"
                    value={customerData.email}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Phone:</label>
                <input
                    type="tel"
                    name="phone"
                    value={customerData.phone}
                    onChange={handleChange}
                />
            </div>
            <div>
                <label>Address:</label>
                <input
                    type="text"
                    name="address"
                    value={customerData.address}
                    onChange={handleChange}
                />
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default CustomerForm;