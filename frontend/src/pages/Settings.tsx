import React, { useEffect, useState } from 'react';
import { Settings as SettingsType } from '../types';
import { fetchSettings, updateSettings } from '../services/api';

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<SettingsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [formData, setFormData] = useState({
        firma_nazwa: '',
        firma_nip: '',
        ksef_token: '',
        ksef_environment: 'test' as 'production' | 'test' | 'demo',
        auto_fetch_ksef: false,
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await fetchSettings();
            setSettings(data);
            setFormData({
                firma_nazwa: data.firma_nazwa || '',
                firma_nip: data.firma_nip || '',
                ksef_token: data.ksef_token || '',
                ksef_environment: data.ksef_environment || 'test',
                auto_fetch_ksef: data.auto_fetch_ksef || false,
            });
        } catch (error) {
            console.error('Błąd ładowania ustawień:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await updateSettings(formData);
            setMessage({ type: 'success', text: 'Ustawienia zostały zapisane' });
            loadSettings();
        } catch (error) {
            console.error('Błąd zapisywania:', error);
            setMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania ustawień' });
        } finally {
            setSaving(false);
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
                    <h1 className="page-title">Ustawienia</h1>
                    <p className="page-subtitle">Konfiguracja firmy i integracji KSeF</p>
                </div>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Dane firmy */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">Dane firmy</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Nazwa firmy</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.firma_nazwa}
                                    onChange={(e) => setFormData({ ...formData, firma_nazwa: e.target.value })}
                                    placeholder="Twoja Firma Sp. z o.o."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">NIP firmy</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.firma_nip}
                                    onChange={(e) => setFormData({ ...formData, firma_nip: e.target.value })}
                                    placeholder="1234567890"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Konfiguracja KSeF */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">Integracja z KSeF</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Środowisko KSeF</label>
                            <select
                                className="form-control"
                                value={formData.ksef_environment}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    ksef_environment: e.target.value as 'production' | 'test' | 'demo' 
                                })}
                            >
                                <option value="demo">Demo (do testów)</option>
                                <option value="test">Test (środowisko testowe)</option>
                                <option value="production">Produkcja (prawdziwe faktury)</option>
                            </select>
                            <small style={{ color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                                {formData.ksef_environment === 'production' 
                                    ? '⚠️ Uwaga: Środowisko produkcyjne - operacje są nieodwracalne'
                                    : 'Bezpieczne środowisko do testowania integracji'}
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Token autoryzacyjny KSeF</label>
                            <textarea
                                className="form-control"
                                value={formData.ksef_token}
                                onChange={(e) => setFormData({ ...formData, ksef_token: e.target.value })}
                                placeholder="Wklej token autoryzacyjny z KSeF..."
                                rows={4}
                                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                            <small style={{ color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                                Token można wygenerować w panelu KSeF Ministerstwa Finansów
                            </small>
                        </div>

                        <div className="form-group">
                            <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={formData.auto_fetch_ksef}
                                    onChange={(e) => setFormData({ ...formData, auto_fetch_ksef: e.target.checked })}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <span>
                                    <strong>Automatyczne pobieranie faktur z KSeF</strong>
                                    <br />
                                    <small style={{ color: 'var(--text-muted)' }}>
                                        System będzie automatycznie sprawdzał nowe faktury
                                    </small>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Informacje */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">Informacje o aplikacji</h2>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Wersja aplikacji:</span>
                                <strong>Fakturex Next Web 1.0.0</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Backend:</span>
                                <strong>Django REST Framework</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Frontend:</span>
                                <strong>React + TypeScript</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Przycisk zapisu */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;