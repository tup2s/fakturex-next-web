import React, { useEffect, useState, useCallback } from 'react';
import { fetchFromKSeF, fetchSettings, importKSeFInvoices, KSeFInvoice } from '../services/api';
import { Settings } from '../types';

interface FetchResult {
    message: string;
    info?: string;
    settings_configured: boolean;
    environment?: string;
    nip?: string;
    invoices: KSeFInvoice[];
    total_found: number;
    error?: string;
}

const KSeF: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
    
    // Date range
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
    
    // Fetch results
    const [lastFetchResult, setLastFetchResult] = useState<FetchResult | null>(null);
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
    const [importLoading, setImportLoading] = useState(false);
    
    // Preview modal
    const [previewInvoice, setPreviewInvoice] = useState<KSeFInvoice | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await fetchSettings();
            setSettings(data);
        } catch (error) {
            console.error('Błąd ładowania ustawień:', error);
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

    const handleFetchFromKSeF = async () => {
        setFetchLoading(true);
        setMessage(null);
        setLastFetchResult(null);
        setSelectedInvoices(new Set());
        
        try {
            const result = await fetchFromKSeF(dateFrom, dateTo);
            setLastFetchResult(result);
            
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else if (result.invoices && result.invoices.length > 0) {
                // Automatycznie zaznacz faktury, które jeszcze nie istnieją
                const newInvoices = result.invoices.filter(inv => !inv.already_exists);
                setSelectedInvoices(new Set(newInvoices.map(inv => inv.ksef_numer)));
                setMessage({ 
                    type: 'success', 
                    text: `Znaleziono ${result.invoices.length} faktur. Wybierz które chcesz zaimportować.`
                });
            } else {
                setMessage({ 
                    type: 'info', 
                    text: result.message || 'Brak faktur w wybranym okresie.'
                });
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Błąd połączenia z KSeF. Sprawdź konfigurację.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setFetchLoading(false);
        }
    };

    const handleToggleInvoice = (ksefNumer: string) => {
        setSelectedInvoices((prev: Set<string>) => {
            const newSet = new Set(prev);
            if (newSet.has(ksefNumer)) {
                newSet.delete(ksefNumer);
            } else {
                newSet.add(ksefNumer);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (!lastFetchResult?.invoices) return;
        const newInvoices = lastFetchResult.invoices.filter((inv: KSeFInvoice) => !inv.already_exists);
        setSelectedInvoices(new Set(newInvoices.map((inv: KSeFInvoice) => inv.ksef_numer)));
    };

    const handleDeselectAll = () => {
        setSelectedInvoices(new Set());
    };

    const handleImportSelected = async () => {
        if (!lastFetchResult?.invoices || selectedInvoices.size === 0) return;
        
        setImportLoading(true);
        setMessage(null);
        
        try {
            const invoicesToImport = lastFetchResult.invoices.filter(
                (inv: KSeFInvoice) => selectedInvoices.has(inv.ksef_numer) && !inv.already_exists
            );
            
            const result = await importKSeFInvoices(invoicesToImport);
            
            setMessage({ 
                type: 'success', 
                text: `Zaimportowano ${result.imported_count} faktur do systemu.`
            });
            
            // Odśwież listę - oznacz zaimportowane jako istniejące
            setLastFetchResult((prev: FetchResult | null) => {
                if (!prev) return null;
                return {
                    ...prev,
                    invoices: prev.invoices.map((inv: KSeFInvoice) => 
                        selectedInvoices.has(inv.ksef_numer) 
                            ? { ...inv, already_exists: true }
                            : inv
                    )
                };
            });
            setSelectedInvoices(new Set());
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Błąd podczas importu faktur.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setImportLoading(false);
        }
    };

    const setQuickDateRange = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        setDateFrom(d.toISOString().split('T')[0]);
        setDateTo(new Date().toISOString().split('T')[0]);
    };

    const getEnvironmentLabel = (env: string) => {
        switch (env) {
            case 'production': return 'Produkcyjne';
            case 'test': return 'Testowe';
            case 'demo': return 'Demo';
            default: return env;
        }
    };

    const isConfigured = settings?.has_ksef_token && settings?.firma_nip;

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
                    <h1 className="page-title">KSeF</h1>
                    <p className="page-subtitle">Krajowy System e-Faktur - pobieranie faktur kosztowych</p>
                </div>
            </div>

            {/* Status połączenia */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Status połączenia
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="stat-card" style={{ 
                        background: isConfigured ? 'var(--success-bg)' : 'var(--danger-bg)',
                        border: `1px solid ${isConfigured ? 'var(--success)' : 'var(--danger)'}`,
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: isConfigured ? 'var(--success)' : 'var(--danger)'
                        }}>
                            {isConfigured ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            )}
                            <span style={{ fontWeight: 600 }}>
                                {isConfigured ? 'Skonfigurowano' : 'Nie skonfigurowano'}
                            </span>
                        </div>
                    </div>
                    
                    {settings?.firma_nip && (
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '4px' }}>NIP firmy</div>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>{settings.firma_nip}</div>
                        </div>
                    )}
                    
                    {settings?.ksef_environment && (
                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ color: '#a0aec0', fontSize: '12px', marginBottom: '4px' }}>Środowisko</div>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>{getEnvironmentLabel(settings.ksef_environment)}</div>
                        </div>
                    )}
                </div>

            </div>

            {/* Pobieranie faktur - zawsze widoczne */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Pobierz faktury
                </h3>
                
                <p style={{ marginBottom: '20px', color: '#cbd5e0' }}>
                    Wybierz zakres dat, z którego chcesz pobrać faktury kosztowe z Krajowego Systemu e-Faktur.
                    Po pobraniu wybierz które faktury chcesz zaimportować do systemu.
                </p>
                
                {!isConfigured && (
                    <div style={{ 
                        marginBottom: '20px', 
                        padding: '12px 16px', 
                        background: 'rgba(237, 137, 54, 0.2)', 
                        borderRadius: '8px',
                        border: '1px solid #ed8936',
                        color: '#ffffff'
                    }}>
                        <strong>Uwaga:</strong> Aby pobierać faktury, przejdź do{' '}
                        <a href="/settings" style={{ color: '#4299e1', fontWeight: 600 }}>Ustawień</a>{' '}
                        i skonfiguruj token KSeF oraz NIP firmy.
                    </div>
                )}
                
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#e2e8f0' }}>Data od</label>
                        <input
                            type="date"
                            className="form-control"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{ minWidth: '150px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#e2e8f0' }}>Data do</label>
                        <input
                            type="date"
                            className="form-control"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{ minWidth: '150px' }}
                        />
                    </div>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleFetchFromKSeF}
                        disabled={fetchLoading || !isConfigured}
                        style={{ height: '42px' }}
                    >
                        {fetchLoading ? (
                            <>
                                <span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>
                                Pobieranie...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Pobierz z KSeF
                            </>
                        )}
                    </button>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setQuickDateRange(7)}
                    >
                        Ostatnie 7 dni
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setQuickDateRange(30)}
                    >
                        Ostatnie 30 dni
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setQuickDateRange(90)}
                    >
                        Ostatnie 90 dni
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                            const now = new Date();
                            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                            setDateFrom(firstDay.toISOString().split('T')[0]);
                            setDateTo(now.toISOString().split('T')[0]);
                        }}
                    >
                        Bieżący miesiąc
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                            const now = new Date();
                            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                            setDateFrom(firstDay.toISOString().split('T')[0]);
                            setDateTo(lastDay.toISOString().split('T')[0]);
                        }}
                    >
                        Poprzedni miesiąc
                    </button>
                    </div>
                </div>

            {/* Komunikat */}
            {message && (
                <div 
                    className={`alert alert-${message.type}`} 
                    style={{ 
                        marginBottom: '24px',
                        padding: '16px',
                        borderRadius: '8px',
                        background: message.type === 'success' ? 'var(--success-bg)' : 
                                   message.type === 'error' ? 'var(--danger-bg)' : 
                                   message.type === 'warning' ? 'var(--warning-bg)' : 'var(--bg-secondary)',
                        border: `1px solid ${message.type === 'success' ? 'var(--success)' : 
                                             message.type === 'error' ? 'var(--danger)' : 
                                             message.type === 'warning' ? 'var(--warning)' : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >
                    {message.type === 'success' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    )}
                    {message.type === 'error' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    )}
                    {(message.type === 'info' || message.type === 'warning') && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    )}
                    <span>{message.text}</span>
                    <button 
                        onClick={() => setMessage(null)}
                        style={{ 
                            marginLeft: 'auto', 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            color: '#ffffff',
                            fontSize: '20px',
                            lineHeight: 1
                        }}
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Tabela pobranych faktur */}
            {lastFetchResult?.invoices && lastFetchResult.invoices.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', margin: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Pobrane faktury ({lastFetchResult.invoices.length})
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                className="btn btn-sm btn-secondary"
                                onClick={handleSelectAll}
                            >
                                Zaznacz wszystkie
                            </button>
                            <button 
                                className="btn btn-sm btn-secondary"
                                onClick={handleDeselectAll}
                            >
                                Odznacz wszystkie
                            </button>
                            <button 
                                className="btn btn-sm btn-primary"
                                onClick={handleImportSelected}
                                disabled={selectedInvoices.size === 0 || importLoading}
                            >
                                {importLoading ? (
                                    <>
                                        <span className="spinner" style={{ width: '14px', height: '14px', marginRight: '6px' }}></span>
                                        Importowanie...
                                    </>
                                ) : (
                                    `Importuj wybrane (${selectedInvoices.size})`
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table compact" style={{ minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                                    <th>Numer faktury</th>
                                    <th>Data</th>
                                    <th>Termin płatności</th>
                                    <th>Dostawca</th>
                                    <th style={{ textAlign: 'right' }}>Kwota</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ textAlign: 'center' }}>Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastFetchResult.invoices.map((invoice) => {
                                    const inv = invoice as any;
                                    return (
                                    <tr 
                                        key={invoice.ksef_numer}
                                        style={{ 
                                            opacity: invoice.already_exists ? 0.6 : 1,
                                            background: selectedInvoices.has(invoice.ksef_numer) ? 'rgba(66, 153, 225, 0.15)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedInvoices.has(invoice.ksef_numer)}
                                                onChange={() => handleToggleInvoice(invoice.ksef_numer)}
                                                disabled={invoice.already_exists}
                                                style={{ 
                                                    width: '18px', 
                                                    height: '18px',
                                                    cursor: invoice.already_exists ? 'not-allowed' : 'pointer'
                                                }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 500, color: '#ffffff' }}>{invoice.numer}</td>
                                        <td style={{ color: '#e2e8f0' }}>{invoice.data}</td>
                                        <td style={{ color: inv.termin_platnosci ? '#ed8936' : '#a0aec0' }}>
                                            {inv.termin_platnosci || '-'}
                                        </td>
                                        <td style={{ color: '#e2e8f0' }}>{invoice.dostawca}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#ffffff' }}>
                                            {formatCurrency(invoice.kwota)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {invoice.already_exists ? (
                                                <span style={{ 
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    background: 'rgba(160, 174, 192, 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    color: '#a0aec0'
                                                }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                        <polyline points="22 4 12 14.01 9 11.01" />
                                                    </svg>
                                                    W bazie
                                                </span>
                                            ) : (
                                                <span style={{ 
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    background: 'rgba(72, 187, 120, 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    color: '#48bb78'
                                                }}>
                                                    Nowa
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => setPreviewInvoice(invoice)}
                                                title="Podgląd faktury"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Preview Modal - Podgląd faktury */}
            {previewInvoice && (() => {
                const inv = previewInvoice as any;
                return (
                <div className="modal-overlay" onClick={() => setPreviewInvoice(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '95vh', overflow: 'auto', padding: 0 }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #333' }}>
                            <h3>Podgląd faktury</h3>
                            <button className="modal-close" onClick={() => setPreviewInvoice(null)}>&times;</button>
                        </div>
                        
                        {/* Dokument faktury - biały styl */}
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
                                    <div style={{ fontWeight: 'bold' }}>{inv.data_sprzedazy || previewInvoice.data}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Termin płatności</div>
                                    <div style={{ fontWeight: 'bold', color: inv.termin_platnosci ? '#c00' : '#333' }}>{inv.termin_platnosci || '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Forma płatności</div>
                                    <div style={{ fontWeight: 'bold' }}>{inv.forma_platnosci || 'przelew'}</div>
                                </div>
                            </div>
                            
                            {/* Strony transakcji */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
                                {/* Sprzedawca */}
                                <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Sprzedawca</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{previewInvoice.dostawca}</div>
                                    <div style={{ marginBottom: '4px' }}>NIP: <strong>{inv.dostawca_nip || '-'}</strong></div>
                                    {inv.dostawca_adres && <div style={{ fontSize: '11px', color: '#555' }}>{inv.dostawca_adres}</div>}
                                </div>
                                
                                {/* Nabywca */}
                                <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Nabywca</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{inv.nabywca || '-'}</div>
                                    <div>NIP: <strong>{inv.nabywca_nip || '-'}</strong></div>
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
                                        {inv.pozycje && inv.pozycje.length > 0 ? inv.pozycje.map((poz: any, idx: number) => {
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
                                                    Brak szczegółowych pozycji - kwota całkowita: {formatCurrency(previewInvoice.kwota)}
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
                                        <strong>{inv.pozycje && inv.pozycje.length > 0 
                                            ? inv.pozycje.reduce((sum: number, p: any) => sum + parseFloat(p.wartosc_netto || '0'), 0).toFixed(2) + ' zł'
                                            : '-'}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
                                        <span>VAT:</span>
                                        <strong>{inv.pozycje && inv.pozycje.length > 0 
                                            ? inv.pozycje.reduce((sum: number, p: any) => {
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
                            <button className="btn btn-primary" onClick={() => setPreviewInvoice(null)}>
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

        </div>
    );
};

export default KSeF;
