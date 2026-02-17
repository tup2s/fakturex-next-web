import React, { useState } from 'react';

const InvoiceForm = () => {
    const [invoiceData, setInvoiceData] = useState({
        customerName: '',
        invoiceNumber: '',
        date: '',
        items: [{ description: '', quantity: 1, price: 0 }],
        total: 0,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData({ ...invoiceData, [name]: value });
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const items = [...invoiceData.items];
        items[index][name] = value;
        setInvoiceData({ ...invoiceData, items });
    };

    const addItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { description: '', quantity: 1, price: 0 }],
        });
    };

    const calculateTotal = () => {
        const total = invoiceData.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
        setInvoiceData({ ...invoiceData, total });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        calculateTotal();
        // Submit the invoice data to the backend
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create Invoice</h2>
            <div>
                <label>Customer Name:</label>
                <input type="text" name="customerName" value={invoiceData.customerName} onChange={handleChange} required />
            </div>
            <div>
                <label>Invoice Number:</label>
                <input type="text" name="invoiceNumber" value={invoiceData.invoiceNumber} onChange={handleChange} required />
            </div>
            <div>
                <label>Date:</label>
                <input type="date" name="date" value={invoiceData.date} onChange={handleChange} required />
            </div>
            <h3>Items</h3>
            {invoiceData.items.map((item, index) => (
                <div key={index}>
                    <label>Description:</label>
                    <input type="text" name="description" value={item.description} onChange={(e) => handleItemChange(index, e)} required />
                    <label>Quantity:</label>
                    <input type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} required />
                    <label>Price:</label>
                    <input type="number" name="price" value={item.price} onChange={(e) => handleItemChange(index, e)} required />
                </div>
            ))}
            <button type="button" onClick={addItem}>Add Item</button>
            <h3>Total: {invoiceData.total}</h3>
            <button type="submit">Submit Invoice</button>
        </form>
    );
};

export default InvoiceForm;