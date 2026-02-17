import React, { useEffect, useState } from 'react';
import { fetchProducts } from '../services/api';
import ProductList from '../components/Product/ProductList';
import { Product } from '../types';

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts();
                setProducts(data);
            } catch (err) {
                setError('Failed to load products');
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h1>Products</h1>
            <ProductList products={products} />
        </div>
    );
};

export default Products;