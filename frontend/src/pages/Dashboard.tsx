import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInvoices, fetchCustomers, fetchProducts } from '../services/api';
import { Invoice, Customer, Product } from '../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({
        invoicesCount: 0,
        customersCount: 0,
        productsCount: 0,
        totalRevenue: 0,
        unpaidInvoices: 0,
        recentInvoices: [] as Invoice[],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [invoices, customers, products] = await Promise.all([
                    fetchInvoices(),
                    fetchCustomers(),
                    fetchProducts(),
                ]);

                const paidInvoices = invoices.filter((i: Invoice) => i.status === 'paid');
                const unpaid = invoices.filter((i: Invoice) => 
                    i.status === 'issued' || i.status === 'overdue'
                );

                setStats({
                    invoicesCount: invoices.length,
                    customersCount: customers.length,
                    productsCount: products.length,
                    totalRevenue: paidInvoices.reduce((sum: number, i: Invoice) => sum + i.total, 0),
                    unpaidInvoices: unpaid.length,
                    recentInvoices: invoices.slice(0, 5),
                });
            } catch (error) {
                console.error('Błąd ładowania:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);
    };

    if (loading) {
        return <div className="dashboard loading">Ładowanie...</div>;
    }

    return (
        <div className="dashboard">
            <h1>Panel główny</h1>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-content">
                        <h3>{stats.invoicesCount}</h3>
                        <p>Faktury</p>
                    </div>
                    <Link to="/invoices" className="stat-link">Zobacz →</Link>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>{stats.customersCount}</h3>
                        <p>Klienci</p>
                    </div>
                    <Link to="/customers" className="stat-link">Zobacz →</Link>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <h3>{stats.productsCount}</h3>
                        <p>Produkty</p>
                    </div>
                    <Link to="/products" className="stat-link">Zobacz →</Link>
                </div>

                <div className="stat-card highlight">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>{formatPrice(stats.totalRevenue)}</h3>
                        <p>Przychód (zapłacone)</p>
                    </div>
                </div>
            </div>

            {stats.unpaidInvoices > 0 && (
                <div className="alert-box">
                    ⚠️ Masz <strong>{stats.unpaidInvoices}</strong> niezapłaconych faktur.{' '}
                    <Link to="/invoices">Sprawdź</Link>
                </div>
            )}

            <div className="dashboard-section">
                <h2>Ostatnie faktury</h2>
                {stats.recentInvoices.length === 0 ? (
                    <p className="empty">Brak faktur. <Link to="/invoices">Utwórz pierwszą fakturę</Link></p>
                ) : (
                    <table className="simple-table">
                        <thead>
                            <tr>
                                <th>Numer</th>
                                <th>Klient</th>
                                <th>Kwota</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td>{invoice.invoice_number}</td>
                                    <td>{invoice.customer_name}</td>
                                    <td>{formatPrice(invoice.total)}</td>
                                    <td>
                                        <span className={`status ${invoice.status}`}>
                                            {invoice.status === 'paid' ? 'Zapłacona' :
                                             invoice.status === 'draft' ? 'Szkic' :
                                             invoice.status === 'issued' ? 'Wystawiona' :
                                             invoice.status === 'overdue' ? 'Przeterminowana' : invoice.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="quick-actions">
                <h2>Szybkie akcje</h2>
                <div className="action-buttons">
                    <Link to="/invoices" className="action-btn primary">+ Nowa faktura</Link>
                    <Link to="/customers" className="action-btn">+ Nowy klient</Link>
                    <Link to="/products" className="action-btn">+ Nowy produkt</Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;