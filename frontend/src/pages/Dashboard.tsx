import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInvoiceStats, fetchRecentUnpaid } from '../services/api';
import { InvoiceStats, Invoice } from '../types';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<InvoiceStats | null>(null);
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Ładuj tylko statystyki bieżącego miesiąca i 5 niezapłaconych faktur
            const [statsData, unpaidInvoices] = await Promise.all([
                fetchInvoiceStats(true), // current_month=true
                fetchRecentUnpaid(5)     // limit=5
            ]);
            setStats(statsData);
            setRecentInvoices(unpaidInvoices);
        } catch (error) {
            console.error('Błąd ładowania danych:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Panel główny</h1>
                    <p className="page-subtitle">Podsumowanie faktur kosztowych - bieżący miesiąc</p>
                </div>
                <Link to="/invoices" className="btn btn-primary">
                    + Dodaj fakturę
                </Link>
            </div>

            {/* Alerty */}
            {stats && stats.przeterminowane_count > 0 && (
                <div className="alert alert-danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                        Masz <strong>{stats.przeterminowane_count}</strong> przeterminowanych faktur 
                        na kwotę <strong>{formatCurrency(stats.suma_przeterminowanych)}</strong>
                    </span>
                </div>
            )}

            {stats && stats.blisko_terminu_count > 0 && (
                <div className="alert alert-warning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                        <strong>{stats.blisko_terminu_count}</strong> faktur z terminem płatności w ciągu 3 dni
                    </span>
                </div>
            )}

            {/* Statystyki */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats?.total_count || 0}</div>
                    <div className="stat-label">Faktur w tym miesiącu</div>
                    <div className="stat-amount">{formatCurrency(stats?.suma_wszystkich || 0)}</div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-value">{stats?.niezaplacone_count || 0}</div>
                    <div className="stat-label">Do zapłaty</div>
                    <div className="stat-amount">{formatCurrency(stats?.suma_niezaplaconych || 0)}</div>
                </div>

                <div className="stat-card danger">
                    <div className="stat-value">{stats?.przeterminowane_count || 0}</div>
                    <div className="stat-label">Przeterminowanych</div>
                    <div className="stat-amount">{formatCurrency(stats?.suma_przeterminowanych || 0)}</div>
                </div>

                <div className="stat-card success">
                    <div className="stat-value">{stats?.zaplacone_count || 0}</div>
                    <div className="stat-label">Zapłaconych</div>
                    <div className="stat-amount">{formatCurrency(stats?.suma_zaplaconych || 0)}</div>
                </div>
            </div>

            {/* Niezapłacone faktury */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Niezapłacone faktury</h2>
                    <Link to="/invoices?status=niezaplacona" className="btn btn-sm btn-secondary">
                        Zobacz wszystkie
                    </Link>
                </div>
                <div className="card-body">
                    {recentInvoices.length === 0 ? (
                        <div className="empty-state">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <h3>Brak faktur</h3>
                            <p>Dodaj pierwszą fakturę, aby rozpocząć</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Numer</th>
                                        <th>Dostawca</th>
                                        <th>Data</th>
                                        <th>Termin</th>
                                        <th style={{ textAlign: 'right' }}>Kwota</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentInvoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td><strong>{invoice.numer}</strong></td>
                                            <td>{invoice.dostawca}</td>
                                            <td>{invoice.data}</td>
                                            <td>{invoice.termin_platnosci}</td>
                                            <td className="amount">{formatCurrency(invoice.kwota)}</td>
                                            <td>
                                                <span className={`status ${
                                                    invoice.is_overdue ? 'status-przeterminowana' :
                                                    invoice.status === 'zaplacona' ? 'status-zaplacona' : 'status-niezaplacona'
                                                }`}>
                                                    {invoice.is_overdue ? 'Przeterminowana' :
                                                     invoice.status === 'zaplacona' ? 'Zapłacona' : 'Niezapłacona'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;