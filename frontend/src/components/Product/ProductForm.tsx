import React, { useState } from 'react';

const ProductForm = () => {
    const [productName, setProductName] = useState('');
    const [productPrice, setProductPrice] = useState(0);
    const [productDescription, setProductDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission logic here
        console.log({
            name: productName,
            price: productPrice,
            description: productDescription,
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="productName">Product Name:</label>
                <input
                    type="text"
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="productPrice">Product Price:</label>
                <input
                    type="number"
                    id="productPrice"
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                    required
                />
            </div>
            <div>
                <label htmlFor="productDescription">Product Description:</label>
                <textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                />
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default ProductForm;