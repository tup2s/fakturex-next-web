import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, InvoiceFormData, Contractor } from '../types';
import { 
    fetchInvoices, 
    fetchContractors, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice,
    markInvoicePaid,
    markInvoiceUnpaid,
    fetchAvailableYears
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
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<InvoiceFormData>(emptyForm);
    const [filter, setFilter] = useState<'all' | 'niezaplacona' | 'zaplacona' | 'overdue'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    
    // Date filters
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    
    const months = [
        { value: 1, label: 'Styczeń' },
        { value: 2, label: 'Luty' },
        { value: 3, label: 'Marzec' },
        { value: 4, label: 'Kwiecień' },
        { value: 5, label: 'Maj' },
        { value: 6, label: 'Czerwiec' },
        { value: 7, label: 'Lipiec' },
        { value: 8, label: 'Sierpień' },
        { value: 9, label: 'Wrzesień' },
        { value: 10, label: 'Październik' },
        { value: 11, label: 'Listopad' },
        { value: 12, label: 'Grudzień' },
    ];

    // Filter and search - must be before keyboard shortcuts useEffect
    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
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
    }, [invoices, filter, searchTerm]);

    useEffect(() => {
        loadInitialData();
    }, []);
    
    // Reload invoices when year/month changes
    useEffect(() => {
        if (!loading) {
            loadInvoices();
        }
    }, [selectedYear, selectedMonth]);

    // Skróty klawiszowe
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignoruj gdy focus jest w input/textarea
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            // Esc - zamknij modal/podgląd
            if (e.key === 'Escape') {
                if (previewInvoice) {
                    setPreviewInvoice(null);
                } else if (showModal) {
                    handleCloseModal();
                }
                return;
            }

            // Nie obsługuj gdy modal jest otwarty
            if (showModal || previewInvoice) return;

            switch (e.key.toLowerCase()) {
                case 'n':
                    // N - nowa faktura
                    e.preventDefault();
                    handleOpenModal();
                    break;
                case 'k':
                    // K - przejdź do KSeF
                    e.preventDefault();
                    navigate('/ksef');
                    break;
                case 'arrowdown':
                case 'j':
                    // ↓ lub J - następna faktura
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredInvoices.length - 1));
                    break;
                case 'arrowup':
                    // ↑ - poprzednia faktura
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'enter':
                case ' ':
                    // Enter/Spacja - podgląd wybranej faktury
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        setPreviewInvoice(filteredInvoices[selectedIndex]);
                    }
                    break;
                case 'e':
                    // E - edytuj wybraną fakturę
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        handleOpenModal(filteredInvoices[selectedIndex]);
                    }
                    break;
                case 'p':
                    // P - oznacz jako zapłaconą/niezapłaconą
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        handleToggleStatus(filteredInvoices[selectedIndex]);
                    }
                    break;
                case '1':
                    // 1 - wszystkie
                    e.preventDefault();
                    setFilter('all');
                    break;
                case '2':
                    // 2 - niezapłacone
                    e.preventDefault();
                    setFilter('niezaplacona');
                    break;
                case '3':
                    // 3 - zapłacone
                    e.preventDefault();
                    setFilter('zaplacona');
                    break;
                case '4':
                    // 4 - przeterminowane
                    e.preventDefault();
                    setFilter('overdue');
                    break;
                case '/':
                    // / - szukaj
                    e.preventDefault();
                    document.getElementById('search-input')?.focus();
                    break;
                case 'c':
                    // C - kopiuj numer faktury
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        const numer = filteredInvoices[selectedIndex].numer;
                        navigator.clipboard.writeText(numer).then(() => {
                            // Mini feedback - można dodać toast
                            console.log('Skopiowano numer:', numer);
                        });
                    }
                    break;
                case 'w':
                    // W - kopiuj kwotę
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        const kwota = filteredInvoices[selectedIndex].kwota.toFixed(2);
                        navigator.clipboard.writeText(kwota).then(() => {
                            console.log('Skopiowano kwotę:', kwota);
                        });
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showModal, previewInvoice, selectedIndex, filteredInvoices, navigate]);

    const loadInitialData = async () => {
        try {
            const [invoicesData, contractorsData, yearsData] = await Promise.all([
                fetchInvoices(),
                fetchContractors(),
                fetchAvailableYears()
            ]);
            setInvoices(invoicesData);
            setContractors(contractorsData);
            setAvailableYears(yearsData);
        } catch (error) {
            console.error('Błąd ładowania:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const loadInvoices = async () => {
        try {
            const params: { year?: number; month?: number } = {};
            if (selectedYear) params.year = selectedYear;
            if (selectedMonth) params.month = selectedMonth;
            const invoicesData = await fetchInvoices(params);
            setInvoices(invoicesData);
        } catch (error) {
            console.error('Błąd ładowania faktur:', error);
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
            loadInvoices();
        } catch (error) {
            console.error('Błąd zapisywania:', error);
            alert('Wystąpił błąd podczas zapisywania faktury');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Czy na pewno chcesz usunąć tę fakturę?')) {
            try {
                await deleteInvoice(id);
                loadInvoices();
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
            loadInvoices();
        } catch (error) {
            console.error('Błąd zmiany statusu:', error);
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
                        onClick={() => navigate('/ksef')}
                    >
                        ⇒ KSeF
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        + Dodaj fakturę
                    </button>
                </div>
            </div>

            {/* Filtry */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '200px' }}>
                        <input
                            id="search-input"
                            type="text"
                            className="form-control"
                            placeholder="Szukaj po numerze lub dostawcy... (wciśnij /)"
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                            className="form-control" 
                            value={selectedYear ?? ''} 
                            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                            style={{ width: '120px' }}
                        >
                            <option value="">Wszystkie lata</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <select 
                            className="form-control" 
                            value={selectedMonth ?? ''} 
                            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                            style={{ width: '140px' }}
                        >
                            <option value="">Wszystkie miesiące</option>
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
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
                                filteredInvoices.map((invoice, index) => (
                                    <tr 
                                        key={invoice.id}
                                        className={selectedIndex === index ? 'selected' : ''}
                                        onClick={() => setSelectedIndex(index)}
                                        onDoubleClick={() => setPreviewInvoice(invoice)}
                                        style={{ cursor: 'pointer' }}
                                    >
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
                                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(invoice); }}
                                                title="Kliknij, aby zmienić status"
                                            >
                                                {invoice.is_overdue ? 'Przeterminowana' :
                                                 invoice.status === 'zaplacona' ? 'Zapłacona' : 'Niezapłacona'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button 
                                                    className="btn btn-sm btn-icon"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewInvoice(invoice); }}
                                                    title="Podgląd (Enter)"
                                                >
                                                    👁
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(invoice); }}
                                                    title="Edytuj (E)"
                                                >
                                                    Edytuj
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(invoice.id); }}
                                                    title="Usuń"
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

            {/* Modal podglądu faktury */}
            {previewInvoice && (
                <div className="modal-overlay" onClick={() => setPreviewInvoice(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Podgląd faktury</h2>
                            <button className="modal-close" onClick={() => setPreviewInvoice(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="invoice-preview">
                                <div className="preview-header">
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-blue)' }}>
                                        {previewInvoice.numer}
                                    </h3>
                                    <span className={`status ${
                                        previewInvoice.is_overdue ? 'status-przeterminowana' :
                                        previewInvoice.status === 'zaplacona' ? 'status-zaplacona' : 'status-niezaplacona'
                                    }`}>
                                        {previewInvoice.is_overdue ? 'Przeterminowana' :
                                         previewInvoice.status === 'zaplacona' ? 'Zapłacona' : 'Niezapłacona'}
                                    </span>
                                </div>
                                
                                <div className="preview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                    <div>
                                        <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Dostawca</p>
                                        <p style={{ fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>{previewInvoice.dostawca}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Kwota</p>
                                        <p style={{ fontWeight: '700', fontSize: '1.5rem', margin: 0, color: 'var(--accent-green)' }}>
                                            {formatCurrency(previewInvoice.kwota)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Data wystawienia</p>
                                        <p style={{ margin: 0, color: 'var(--text-primary)' }}>{previewInvoice.data}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Termin płatności</p>
                                        <p style={{ margin: 0, color: previewInvoice.is_overdue ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                                            {previewInvoice.termin_platnosci}
                                            {previewInvoice.is_overdue && ' (przeterminowana)'}
                                        </p>
                                    </div>
                                    {previewInvoice.ksef_numer && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Numer KSeF</p>
                                            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                {previewInvoice.ksef_numer}
                                            </p>
                                        </div>
                                    )}
                                    {previewInvoice.notatki && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ color: 'var(--text-label)', fontSize: '0.85rem', marginBottom: '4px' }}>Notatki</p>
                                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{previewInvoice.notatki}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    handleToggleStatus(previewInvoice);
                                    setPreviewInvoice(null);
                                }}
                            >
                                {previewInvoice.status === 'zaplacona' ? 'Oznacz jako niezapłaconą' : 'Oznacz jako zapłaconą'}
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    handleOpenModal(previewInvoice);
                                    setPreviewInvoice(null);
                                }}
                            >
                                Edytuj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pomoc - skróty klawiszowe (ukryte na mobile) */}
            <div className="keyboard-shortcuts-help">
                <strong style={{ color: 'var(--text-primary)' }}>Skróty:</strong>{' '}
                <kbd>N</kbd> Nowa · <kbd>K</kbd> KSeF · <kbd>↑↓</kbd> Nawigacja · <kbd>Enter</kbd> Podgląd · <kbd>E</kbd> Edytuj · <kbd>P</kbd> Płatność · <kbd>/</kbd> Szukaj
            </div>
        </div>
    );
};

export default Invoices;
