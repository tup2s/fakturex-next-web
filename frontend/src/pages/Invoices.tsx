import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice, InvoiceFormData, Contractor } from '../types';
import { useToast } from '../components/common/Toast';
import { 
    fetchInvoices, 
    fetchContractors, 
    createInvoice, 
    updateInvoice, 
    deleteInvoice,
    markInvoicePaid,
    markInvoiceUnpaid,
    fetchAvailableYears,
    fetchInvoiceKSeFData,
    refreshInvoiceKSeFData,
    KSeFInvoice
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
    const { showToast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<InvoiceFormData>(emptyForm);
    const [filter, setFilter] = useState<'all' | 'niezaplacona' | 'zaplacona' | 'overdue'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [ksefPreviewData, setKsefPreviewData] = useState<KSeFInvoice | null>(null);
    const [loadingKsefData, setLoadingKsefData] = useState(false);
    const [refreshingKsefData, setRefreshingKsefData] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    // Zawsze tryb kompaktowy
    const compactMode = true;
    
    // Date filters - default to current month/year for faster loading
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | null>(() => new Date().getMonth() + 1);
    
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
                        handleKsefPreview(filteredInvoices[selectedIndex]);
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
                            showToast(`Skopiowano: ${numer}`, 'success');
                        });
                    }
                    break;
                case 'w':
                    // W - kopiuj kwotę
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < filteredInvoices.length) {
                        const kwota = filteredInvoices[selectedIndex].kwota.toFixed(2);
                        navigator.clipboard.writeText(kwota).then(() => {
                            showToast(`Skopiowano: ${kwota} zł`, 'success');
                        });
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showModal, previewInvoice, selectedIndex, filteredInvoices, navigate, showToast]);

    const loadInitialData = async () => {
        try {
            // Pobierz faktury tylko z bieżącego miesiąca dla szybszego ładowania
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const [invoicesData, contractorsData, yearsData] = await Promise.all([
                fetchInvoices({ year: currentYear, month: currentMonth }),
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
                showToast(`${invoice.numer} - Niezapłacona`, 'info');
            } else {
                await markInvoicePaid(invoice.id);
                showToast(`${invoice.numer} - Zapłacona`, 'success');
            }
            loadInvoices();
        } catch (error) {
            console.error('Błąd zmiany statusu:', error);
            showToast('Błąd zmiany statusu', 'error');
        }
    };

    const handleKsefPreview = async (invoice: Invoice) => {
        if (!invoice.ksef_numer) {
            // Zwykły podgląd dla faktur bez KSeF
            setPreviewInvoice(invoice);
            return;
        }
        
        setLoadingKsefData(true);
        setPreviewInvoice(invoice);
        
        try {
            const ksefData = await fetchInvoiceKSeFData(invoice.id);
            setKsefPreviewData(ksefData);
        } catch (error) {
            console.error('Błąd pobierania danych KSeF:', error);
            setKsefPreviewData(null);
        } finally {
            setLoadingKsefData(false);
        }
    };

    const closePreview = () => {
        setPreviewInvoice(null);
        setKsefPreviewData(null);
    };

    const handleRefreshKsefData = async () => {
        if (!previewInvoice || !previewInvoice.ksef_numer) return;
        
        setRefreshingKsefData(true);
        try {
            const result = await refreshInvoiceKSeFData(previewInvoice.id);
            if (result.success) {
                showToast('Dane KSeF zostały zaktualizowane', 'success');
                // Pobierz zaktualizowane dane
                const ksefData = await fetchInvoiceKSeFData(previewInvoice.id);
                setKsefPreviewData(ksefData);
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Błąd odświeżania danych KSeF';
            showToast(msg, 'error');
        } finally {
            setRefreshingKsefData(false);
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
                    <table className={`table${compactMode ? ' compact' : ''}`}>
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
                                        onDoubleClick={() => handleKsefPreview(invoice)}
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
                                                    onClick={(e) => { e.stopPropagation(); handleKsefPreview(invoice); }}
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
                <div className="modal-overlay" onClick={closePreview}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: previewInvoice.ksef_numer && ksefPreviewData ? '900px' : '700px', maxHeight: '95vh', overflow: 'auto', padding: previewInvoice.ksef_numer && ksefPreviewData ? 0 : undefined }}>
                        <div className="modal-header" style={{ borderBottom: previewInvoice.ksef_numer && ksefPreviewData ? '1px solid #333' : undefined }}>
                            <h2 className="modal-title">Podgląd faktury {previewInvoice.ksef_numer ? '(KSeF)' : ''}</h2>
                            <button className="modal-close" onClick={closePreview}>×</button>
                        </div>
                        
                        {/* Jeśli faktura z KSeF i mamy dane - pokaż pełny dokument */}
                        {previewInvoice.ksef_numer && ksefPreviewData ? (
                            <>
                            <div id="ksef-invoice-print" style={{ 
                                background: '#ffffff', 
                                color: '#000000', 
                                padding: '40px',
                                fontFamily: 'Arial, sans-serif',
                                fontSize: '12px',
                                lineHeight: 1.4
                            }}>
                                {/* Nagłówek faktury */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>FAKTURA VAT</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{previewInvoice.numer}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Dokument KSeF</div>
                                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#999', maxWidth: '200px', wordBreak: 'break-all' }}>
                                            {previewInvoice.ksef_numer}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Daty */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Data wystawienia</div>
                                        <div style={{ fontWeight: 'bold' }}>{previewInvoice.data}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Data sprzedaży</div>
                                        <div style={{ fontWeight: 'bold' }}>{ksefPreviewData.data_sprzedazy || previewInvoice.data}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Termin płatności</div>
                                        <div style={{ fontWeight: 'bold', color: ksefPreviewData.termin_platnosci ? '#c00' : '#333' }}>{ksefPreviewData.termin_platnosci || previewInvoice.termin_platnosci}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Forma płatności</div>
                                        <div style={{ fontWeight: 'bold' }}>{ksefPreviewData.forma_platnosci || 'przelew'}</div>
                                    </div>
                                </div>
                                
                                {/* Strony transakcji */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                                    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Sprzedawca</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{previewInvoice.dostawca}</div>
                                        <div style={{ marginBottom: '4px' }}>NIP: <strong>{ksefPreviewData.dostawca_nip || '-'}</strong></div>
                                        {ksefPreviewData.dostawca_adres && <div style={{ fontSize: '11px', color: '#555' }}>{ksefPreviewData.dostawca_adres}</div>}
                                    </div>
                                    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Nabywca</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{ksefPreviewData.nabywca || '-'}</div>
                                        <div>NIP: <strong>{ksefPreviewData.nabywca_nip || '-'}</strong></div>
                                    </div>
                                </div>
                                
                                {/* Pozycje faktury */}
                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>Pozycje faktury</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5' }}>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #333', width: '30px' }}>Lp.</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #333' }}>Nazwa towaru lub usługi</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #333', width: '50px' }}>J.m.</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #333', width: '60px' }}>Ilość</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #333', width: '90px' }}>Cena netto</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #333', width: '100px' }}>Wartość netto</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #333', width: '50px' }}>VAT</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #333', width: '100px' }}>Wartość brutto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ksefPreviewData.pozycje && ksefPreviewData.pozycje.length > 0 ? ksefPreviewData.pozycje.map((poz: any, idx: number) => {
                                                const netto = parseFloat(poz.wartosc_netto || poz.cena_netto || '0');
                                                const vatRate = parseFloat(poz.stawka_vat || '23') / 100;
                                                const brutto = netto * (1 + vatRate);
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '8px' }}>{poz.nazwa || '-'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>{poz.jednostka || 'szt.'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'right' }}>{poz.ilosc || '1'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'right' }}>{poz.cena_netto ? `${parseFloat(poz.cena_netto).toFixed(2)} zł` : '-'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'right' }}>{poz.wartosc_netto ? `${parseFloat(poz.wartosc_netto).toFixed(2)} zł` : '-'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>{poz.stawka_vat || '23'}%</td>
                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>{brutto.toFixed(2)} zł</td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                                        <div style={{ marginBottom: '12px' }}>
                                                            Brak szczegółowych pozycji - kwota całkowita: {formatCurrency(previewInvoice.kwota)}
                                                        </div>
                                                        <button 
                                                            onClick={handleRefreshKsefData}
                                                            disabled={refreshingKsefData}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: '#4299e1',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: refreshingKsefData ? 'wait' : 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {refreshingKsefData ? 'Pobieranie...' : '🔄 Pobierz dane z KSeF'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Podsumowanie */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
                                    <div style={{ width: '300px', border: '2px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                                            <span>Razem netto:</span>
                                            <strong>{ksefPreviewData.pozycje && ksefPreviewData.pozycje.length > 0 
                                                ? ksefPreviewData.pozycje.reduce((sum: number, p: any) => sum + parseFloat(p.wartosc_netto || '0'), 0).toFixed(2) + ' zł'
                                                : '-'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
                                            <span>VAT:</span>
                                            <strong>{ksefPreviewData.pozycje && ksefPreviewData.pozycje.length > 0 
                                                ? ksefPreviewData.pozycje.reduce((sum: number, p: any) => {
                                                    const netto = parseFloat(p.wartosc_netto || '0');
                                                    const vat = netto * (parseFloat(p.stawka_vat || '23') / 100);
                                                    return sum + vat;
                                                  }, 0).toFixed(2) + ' zł'
                                                : '-'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#333', color: '#fff', fontSize: '16px' }}>
                                            <span>DO ZAPŁATY:</span>
                                            <strong>{formatCurrency(previewInvoice.kwota)}</strong>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Stopka */}
                                <div style={{ borderTop: '1px solid #ddd', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', fontSize: '10px', color: '#666' }}>
                                    <div>
                                        <div style={{ marginBottom: '40px' }}>
                                            <div>Wystawił(a):</div>
                                            <div style={{ marginTop: '30px', borderTop: '1px dotted #999', paddingTop: '4px' }}>podpis</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ marginBottom: '40px' }}>
                                            <div>Odebrał(a):</div>
                                            <div style={{ marginTop: '30px', borderTop: '1px dotted #999', paddingTop: '4px' }}>podpis</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333' }}>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        const printContent = document.getElementById('ksef-invoice-print');
                                        if (printContent) {
                                            const printWindow = window.open('', '_blank');
                                            if (printWindow) {
                                                printWindow.document.write(`
                                                    <!DOCTYPE html>
                                                    <html>
                                                    <head>
                                                        <title>Faktura ${previewInvoice.numer}</title>
                                                        <style>
                                                            @page { size: A4; margin: 15mm; }
                                                            body { margin: 0; padding: 0; }
                                                        </style>
                                                    </head>
                                                    <body>${printContent.outerHTML}</body>
                                                    </html>
                                                `);
                                                printWindow.document.close();
                                                setTimeout(() => printWindow.print(), 250);
                                            }
                                        }
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                                        <polyline points="6 9 6 2 18 2 18 9" />
                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                        <rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    Drukuj fakturę
                                </button>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            handleToggleStatus(previewInvoice);
                                            closePreview();
                                        }}
                                    >
                                        {previewInvoice.status === 'zaplacona' ? 'Niezapłacona' : 'Zapłacona'}
                                    </button>
                                    <button className="btn btn-primary" onClick={closePreview}>
                                        Zamknij
                                    </button>
                                </div>
                            </div>
                            </>
                        ) : loadingKsefData ? (
                            <div className="modal-body" style={{ padding: '40px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                                <p>Ładowanie danych KSeF...</p>
                            </div>
                        ) : (
                            /* Standardowy podgląd dla faktur bez KSeF */
                            <>
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
                                    closePreview();
                                }}
                            >
                                {previewInvoice.status === 'zaplacona' ? 'Oznacz jako niezapłaconą' : 'Oznacz jako zapłaconą'}
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    handleOpenModal(previewInvoice);
                                    closePreview();
                                }}
                            >
                                Edytuj
                            </button>
                        </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
