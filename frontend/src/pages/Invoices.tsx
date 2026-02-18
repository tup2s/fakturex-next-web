import React, { useEffect, useState } from 'react';
import { Invoice, InvoiceFormData, Contractor } from '../types';
import { 
    fetchInvoices, 
    fetchContractors, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice,
    markInvoicePaid,
    markInvoiceUnpaid,
    fetchFromKSeF
} from '../services/api';

const emptyForm: InvoiceFormData = {
    numer: '',
    data: new Date().toISOString().split('T')[0],
    kwota: '',
    dostawca: '',
    termin_platnosci: '',
    status: 'niezaplacona',
    kontrahent: null,
    notatki: '',
};

const Invoices: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<InvoiceFormData>(emptyForm);
    const [filter, setFilter] = useState<'all' | 'niezaplacona' | 'zaplacona' | 'overdue'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [ksefLoading, setKsefLoading] = useState(false);
    const [ksefMessage, setKsefMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [invoicesData, contractorsData] = await Promise.all([
                fetchInvoices(),
                fetchContractors()
            ]);
            setInvoices(invoicesData);
            setContractors(contractorsData);
        } catch (error) {
            console.error('Błąd ładowania:', error);
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

    const handleOpenModal = (invoice?: Invoice) => {
        if (invoice) {
            setEditingId(invoice.id);
            setFormData({
                numer: invoice.numer,
                data: invoice.data,
                kwota: invoice.kwota,
                dostawca: invoice.dostawca,
                termin_platnosci: invoice.termin_platnosci,
                status: invoice.status,
                kontrahent: invoice.kontrahent,
                notatki: invoice.notatki,
            });
        } else {
            setEditingId(null);
            // Set default due date to 14 days from now
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            setFormData({
                ...emptyForm,
                termin_platnosci: dueDate.toISOString().split('T')[0]
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                kwota: parseFloat(String(formData.kwota))
            };
            
            if (editingId) {
                await updateInvoice(editingId, data);
            } else {
                await createInvoice(data);
            }
            handleCloseModal();
            loadData();
        } catch (error) {
            console.error('Błąd zapisywania:', error);
            alert('Wystąpił błąd podczas zapisywania faktury');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
            try {
                await deleteInvoice(id);
                loadData();
            } catch (error) {
                console.error('Błąd usuwania:', error);
            }
        }
    };

    const handleToggleStatus = async (invoice: Invoice) => {
        try {
            if (invoice.status === 'zaplacona') {
                await markInvoiceUnpaid(invoice.id);
            } else {
                await markInvoicePaid(invoice.id);
            }
            loadData();
        } catch (error) {
            console.error('Błąd zmiany statusu:', error);
        }
    };

    const handleFetchFromKSeF = async () => {
        setKsefLoading(true);
        setKsefMessage(null);
        try {
            const result = await fetchFromKSeF();
            if (result.error) {
                setKsefMessage({ type: 'error', text: result.error });
            } else {
                setKsefMessage({ 
                    type: result.imported_count > 0 ? 'success' : 'info', 
                    text: result.message + (result.info ? ` ${result.info}` : '')
                });
                if (result.imported_count > 0) {
                    loadData();
                }
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Błąd podczas pobierania z KSeF';
            setKsefMessage({ type: 'error', text: errorMsg });
        } finally {
            setKsefLoading(false);
        }
    };

    const handleContractorSelect = (contractorId: string) => {
        if (contractorId) {
            const contractor = contractors.find(c => c.id === parseInt(contractorId));
            if (contractor) {
                setFormData({
                    ...formData,
                    kontrahent: contractor.id,
                    dostawca: contractor.nazwa
                });
            }
        } else {
            setFormData({
                ...formData,
                kontrahent: null
            });
        }
    };

    // Filter and search
    const filteredInvoices = invoices.filter(invoice => {
        // Filter by status
        if (filter === 'niezaplacona' && invoice.status !== 'niezaplacona') return false;
        if (filter === 'zaplacona' && invoice.status !== 'zaplacona') return false;
        if (filter === 'overdue' && !invoice.is_overdue) return false;
        
        // Search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                invoice.numer.toLowerCase().includes(search) ||
                invoice.dostawca.toLowerCase().includes(search)
            );
        }
        
        return true;
    });

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
                    <h1 className="page-title">Faktury</h1>
                    <p className="page-subtitle">Zarządzaj fakturami kosztowymi</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={handleFetchFromKSeF}
                        disabled={ksefLoading}
                    >
                        {ksefLoading ? 'Pobieranie...' : '⬇ Pobierz z KSeF'}
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        + Dodaj fakturę
                    </button>
                </div>
            </div>

            {ksefMessage && (
                <div className={`alert alert-${ksefMessage.type}`} style={{ marginBottom: '20px' }}>
                    {ksefMessage.text}
                    <button 
                        onClick={() => setKsefMessage(null)} 
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                        ×
                    </button>
                </div>
            )

            {/* Filtry */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '200px' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Szukaj po numerze lub dostawcy..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter('all')}
                        >
                            Wszystkie
                        </button>
                        <button 
                            className={`btn btn-sm ${filter === 'niezaplacona' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter('niezaplacona')}
                        >
                            Niezapłacone
                        </button>
                        <button 
                            className={`btn btn-sm ${filter === 'overdue' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => setFilter('overdue')}
                        >
                            Przeterminowane
                        </button>
                        <button 
                            className={`btn btn-sm ${filter === 'zaplacona' ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => setFilter('zaplacona')}
                        >
                            Zapłacone
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Numer</th>
                                <th>Data</th>
                                <th>Dostawca</th>
                                <th>Termin płatności</th>
                                <th style={{ textAlign: 'right' }}>Kwota</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="empty-state">
                                            <h3>Brak faktur</h3>
                                            <p>Dodaj pierwszą fakturę, aby rozpocząć</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td><strong>{invoice.numer}</strong></td>
                                        <td>{invoice.data}</td>
                                        <td>{invoice.dostawca}</td>
                                        <td>
                                            {invoice.termin_platnosci}
                                            {invoice.days_until_due <= 3 && invoice.status !== 'zaplacona' && (
                                                <span style={{ 
                                                    marginLeft: '8px', 
                                                    fontSize: '0.75rem',
                                                    color: invoice.is_overdue ? 'var(--accent-red)' : 'var(--accent-yellow)'
                                                }}>
                                                    ({invoice.is_overdue ? `${Math.abs(invoice.days_until_due)} dni po terminie` : 
                                                      invoice.days_until_due === 0 ? 'dziś' : 
                                                      invoice.days_until_due === 1 ? 'jutro' : 
                                                      `za ${invoice.days_until_due} dni`})
                                                </span>
                                            )}
                                        </td>
                                        <td className="amount">{formatCurrency(invoice.kwota)}</td>
                                        <td>
                                            <span 
                                                className={`status ${
                                                    invoice.is_overdue ? 'status-przeterminowana' :
                                                    invoice.status === 'zaplacona' ? 'status-zaplacona' : 'status-niezaplacona'
                                                }`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleToggleStatus(invoice)}
                                                title="Kliknij, aby zmienić status"
                                            >
                                                {invoice.is_overdue ? 'Przeterminowana' :
                                                 invoice.status === 'zaplacona' ? 'Zapłacona' : 'Niezapłacona'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button 
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleOpenModal(invoice)}
                                                >
                                                    Edytuj
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(invoice.id)}
                                                >
                                                    Usuń
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingId ? 'Edytuj fakturę' : 'Nowa faktura'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Numer faktury *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.numer}
                                            onChange={(e) => setFormData({ ...formData, numer: e.target.value })}
                                            placeholder="np. FV/2026/02/001"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Data faktury *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.data}
                                            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Kontrahent (opcjonalnie)</label>
                                    <select
                                        className="form-control"
                                        value={formData.kontrahent || ''}
                                        onChange={(e) => handleContractorSelect(e.target.value)}
                                    >
                                        <option value="">-- Wybierz z listy lub wpisz ręcznie --</option>
                                        {contractors.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nazwa} {c.nip && `(${c.nip})`}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Dostawca *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.dostawca}
                                        onChange={(e) => setFormData({ ...formData, dostawca: e.target.value })}
                                        placeholder="Nazwa dostawcy"
                                        required
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kwota brutto (PLN) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="form-control"
                                            value={formData.kwota}
                                            onChange={(e) => setFormData({ ...formData, kwota: e.target.value })}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Termin płatności *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.termin_platnosci}
                                            onChange={(e) => setFormData({ ...formData, termin_platnosci: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-control"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'niezaplacona' | 'zaplacona' })}
                                    >
                                        <option value="niezaplacona">Niezapłacona</option>
                                        <option value="zaplacona">Zapłacona</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Notatki</label>
                                    <textarea
                                        className="form-control"
                                        value={formData.notatki || ''}
                                        onChange={(e) => setFormData({ ...formData, notatki: e.target.value })}
                                        rows={3}
                                        placeholder="Dodatkowe informacje..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Anuluj
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? 'Zapisz zmiany' : 'Dodaj fakturę'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
