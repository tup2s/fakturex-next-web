import React, { useEffect, useState } from 'react';
import { Settings as SettingsType, User } from '../types';
import { fetchSettings, updateSettings, changePassword, fetchUsers, createUser, deleteUser } from '../services/api';

const Settings: React.FC = () => {
    // Stan ustawień firmy
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

    // Stan zmiany hasła
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [changingPassword, setChangingPassword] = useState(false);

    // Stan użytkowników
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [newUserData, setNewUserData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
    });
    const [userMessage, setUserMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [creatingUser, setCreatingUser] = useState(false);

    useEffect(() => {
        loadSettings();
        loadUsers();
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

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (error) {
            console.error('Błąd ładowania użytkowników:', error);
        } finally {
            setLoadingUsers(false);
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangingPassword(true);
        setPasswordMessage(null);

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordMessage({ type: 'error', text: 'Nowe hasła nie są identyczne' });
            setChangingPassword(false);
            return;
        }

        if (passwordData.new_password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Hasło musi mieć co najmniej 6 znaków' });
            setChangingPassword(false);
            return;
        }

        try {
            await changePassword(passwordData);
            setPasswordMessage({ type: 'success', text: 'Hasło zostało zmienione' });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystąpił błąd podczas zmiany hasła';
            setPasswordMessage({ type: 'error', text: errorMsg });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);
        setUserMessage(null);

        try {
            await createUser(newUserData);
            setUserMessage({ type: 'success', text: 'Użytkownik został utworzony' });
            setNewUserData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            setShowUserModal(false);
            loadUsers();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystąpił błąd podczas tworzenia użytkownika';
            setUserMessage({ type: 'error', text: errorMsg });
        } finally {
            setCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!confirm(`Czy na pewno chcesz usunąć użytkownika "${username}"?`)) {
            return;
        }

        try {
            await deleteUser(userId);
            setUserMessage({ type: 'success', text: `Użytkownik ${username} został usunięty` });
            loadUsers();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystąpił błąd podczas usuwania użytkownika';
            setUserMessage({ type: 'error', text: errorMsg });
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
                    <p className="page-subtitle">Konfiguracja firmy, użytkowników i integracji KSeF</p>
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

                {/* Przycisk zapisu ustawień */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                    </button>
                </div>
            </form>

            {/* Zmiana hasła */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Zmiana hasła</h2>
                </div>
                <div className="card-body">
                    {passwordMessage && (
                        <div className={`alert alert-${passwordMessage.type}`} style={{ marginBottom: '16px' }}>
                            {passwordMessage.text}
                        </div>
                    )}
                    <form onSubmit={handleChangePassword}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Aktualne hasło</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nowe hasło</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Powtórz nowe hasło</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-secondary" disabled={changingPassword}>
                                {changingPassword ? 'Zmieniam...' : 'Zmień hasło'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Zarządzanie użytkownikami */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title">Użytkownicy</h2>
                    <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                        + Dodaj użytkownika
                    </button>
                </div>
                <div className="card-body">
                    {userMessage && (
                        <div className={`alert alert-${userMessage.type}`} style={{ marginBottom: '16px' }}>
                            {userMessage.text}
                        </div>
                    )}
                    {loadingUsers ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nazwa użytkownika</th>
                                    <th>Imię i nazwisko</th>
                                    <th>Email</th>
                                    <th>Data utworzenia</th>
                                    <th>Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td><strong>{user.username}</strong></td>
                                        <td>{user.first_name} {user.last_name}</td>
                                        <td>{user.email || '-'}</td>
                                        <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString('pl-PL') : '-'}</td>
                                        <td>
                                            <button 
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                            >
                                                Usuń
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Informacje o aplikacji */}
            <div className="card">
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

            {/* Modal dodawania użytkownika */}
            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Dodaj użytkownika</h2>
                            <button className="modal-close" onClick={() => setShowUserModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nazwa użytkownika *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newUserData.username}
                                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Imię</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newUserData.first_name}
                                            onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nazwisko</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newUserData.last_name}
                                            onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hasło *</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={newUserData.password}
                                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <small style={{ color: 'var(--text-muted)' }}>Minimum 6 znaków</small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                                    Anuluj
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creatingUser}>
                                    {creatingUser ? 'Tworzenie...' : 'Utwórz użytkownika'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;