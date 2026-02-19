import React, { useEffect, useState, useCallback } from 'react';
import { fetchFromKSeF, fetchSettings } from '../services/api';
import { Settings } from '../types';

interface KSeFInvoice {
    ksef_numer: string;
    numer: string;
    data: string;
    kwota: number;
    dostawca: string;
    dostawca_nip: string;
    termin_platnosci: string;
}

interface FetchResult {
    message: string;
    info?: string;
    settings_configured: boolean;
    environment?: string;
    nip?: string;
    imported_count: number;
    skipped_count?: number;
    error?: string;
    invoices?: KSeFInvoice[];
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
        
        try {
            const result = await fetchFromKSeF(dateFrom, dateTo);
            setLastFetchResult(result);
            
            if (result.error) {
                setMessage({ type: 'error', text: result.error });
            } else if (result.imported_count > 0) {
                setMessage({ 
                    type: 'success', 
                    text: `Zaimportowano ${result.imported_count} faktur${result.imported_count === 1 ? 'ę' : result.imported_count < 5 ? 'y' : ''} do systemu.`
                });
            } else if (result.skipped_count && result.skipped_count > 0) {
                setMessage({ 
                    type: 'info', 
                    text: `Wszystkie faktury (${result.skipped_count}) już istnieją w systemie.`
                });
            } else {
                setMessage({ 
                    type: 'info', 
                    text: result.message || 'Brak nowych faktur w wybranym okresie.'
                });
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Błąd połączenia z KSeF. Sprawdź konfigurację.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setFetchLoading(false);
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

    const isConfigured = settings?.ksef_token && settings?.firma_nip;

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
                    Pobrane faktury zostaną automatycznie zapisane w zakładce Faktury.
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

            {/* Informacje o API 2.0 */}
            <div className="card">
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Informacje o KSeF API 2.0
                </h3>
                
                <div style={{ color: '#cbd5e0', lineHeight: 1.6 }}>
                    <p style={{ marginBottom: '12px' }}>
                        Aplikacja korzysta z nowej wersji API KSeF 2.0, która zastąpiła poprzednie API 1.0 
                        (wyłączone 2 lutego 2026).
                    </p>
                    <p style={{ marginBottom: '12px' }}>
                        <strong>Środowiska:</strong>
                    </p>
                    <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                        <li><strong>Demo</strong> - do testów, bez rzeczywistych danych</li>
                        <li><strong>Testowe</strong> - środowisko testowe z danymi testowymi</li>
                        <li><strong>Produkcyjne</strong> - rzeczywiste faktury</li>
                    </ul>
                    <p>
                        <strong>Uwaga:</strong> Token autoryzacyjny KSeF musi być wygenerowany dla API 2.0. 
                        Stare tokeny z API 1.0 nie działają.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default KSeF;
