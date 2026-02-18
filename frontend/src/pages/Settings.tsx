import React, { useEffect, useState } from 'react';
import { Settings as SettingsType, User } from '../types';
import { fetchSettings, updateSettings, changePassword, fetchUsers, createUser, deleteUser } from '../services/api';
import { useAuthContext } from '../App';

type TabId = 'company' | 'ksef' | 'security' | 'users' | 'about';

const Settings: React.FC = () => {
    const { user: currentUser } = useAuthContext();
    const [activeTab, setActiveTab] = useState<TabId>('company');
    
    // Stan ustawien firmy
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

    // Stan zmiany hasla
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Stan uzytkownikow
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

    const tabs: { id: TabId; label: string; icon: string }[] = [
        { id: 'company', label: 'Firma', icon: '' },
        { id: 'ksef', label: 'KSeF', icon: '' },
        { id: 'security', label: 'Bezpieczenstwo', icon: '' },
        { id: 'users', label: 'Uzytkownicy', icon: '' },
        { id: 'about', label: 'O aplikacji', icon: '?' },
    ];

    useEffect(() => {
        loadSettings();
        loadUsers();
    }, []);

    useEffect(() => {
        const password = passwordData.new_password;
        let strength = 0;
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    }, [passwordData.new_password]);

    const loadSettings = async () => {
        try {
            const data = await fetchSettings();
            setSettings(data);
            setFormData({
                firma_nazwa: data.firma_nazwa || '',
                firma_nip: data.firma_nip || '',
                ksef_token: '',
                ksef_environment: data.ksef_environment || 'test',
                auto_fetch_ksef: data.auto_fetch_ksef || false,
            });
        } catch (error) {
            console.error('Blad ladowania ustawien:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (error) {
            console.error('Blad ladowania uzytkownikow:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const dataToSend = { ...formData };
            if (!dataToSend.ksef_token) {
                delete (dataToSend as any).ksef_token;
            }
            
            await updateSettings(dataToSend);
            setMessage({ type: 'success', text: 'Ustawienia zostaly zapisane' });
            loadSettings();
        } catch (error) {
            console.error('Blad zapisywania:', error);
            setMessage({ type: 'error', text: 'Wystapil blad podczas zapisywania ustawien' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangingPassword(true);
        setPasswordMessage(null);

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordMessage({ type: 'error', text: 'Nowe hasla nie sa identyczne' });
            setChangingPassword(false);
            return;
        }

        if (passwordData.new_password.length < 8) {
            setPasswordMessage({ type: 'error', text: 'Haslo musi miec co najmniej 8 znakow' });
            setChangingPassword(false);
            return;
        }

        try {
            await changePassword(passwordData);
            setPasswordMessage({ type: 'success', text: 'Haslo zostalo zmienione pomyslnie' });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystapil blad podczas zmiany hasla';
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
            setUserMessage({ type: 'success', text: 'Uzytkownik zostal utworzony' });
            setNewUserData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            setShowUserModal(false);
            loadUsers();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystapil blad podczas tworzenia uzytkownika';
            setUserMessage({ type: 'error', text: errorMsg });
        } finally {
            setCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!confirm(`Czy na pewno chcesz usunac uzytkownika "${username}"?`)) {
            return;
        }

        try {
            await deleteUser(userId);
            setUserMessage({ type: 'success', text: `Uzytkownik ${username} zostal usuniety` });
            loadUsers();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Wystapil blad podczas usuwania uzytkownika';
            setUserMessage({ type: 'error', text: errorMsg });
        }
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 1) return 'var(--accent-red)';
        if (passwordStrength <= 2) return 'var(--accent-orange)';
        if (passwordStrength <= 3) return 'var(--accent-yellow)';
        return 'var(--accent-green)';
    };

    const getPasswordStrengthLabel = () => {
        if (passwordStrength <= 1) return 'Slabe';
        if (passwordStrength <= 2) return 'Przecietne';
        if (passwordStrength <= 3) return 'Dobre';
        return 'Silne';
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
        <div className="page settings-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ustawienia</h1>
                    <p className="page-subtitle">Konfiguracja systemu Fakturex</p>
                </div>
            </div>

            <div className="settings-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="settings-content">
                {activeTab === 'company' && (
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Dane firmy</h2>
                            <p>Podstawowe informacje o Twojej firmie</p>
                        </div>

                        {message && (
                            <div className={`alert alert-${message.type}`}>{message.text}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="settings-card">
                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>Nazwa firmy</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.firma_nazwa}
                                            onChange={(e) => setFormData({ ...formData, firma_nazwa: e.target.value })}
                                            placeholder="np. Moja Firma Sp. z o.o."
                                        />
                                        <span className="field-hint">Pelna nazwa firmy uzywana na dokumentach</span>
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>NIP</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.firma_nip}
                                            onChange={(e) => setFormData({ ...formData, firma_nip: e.target.value })}
                                            placeholder="1234567890"
                                            pattern="[0-9]{10}"
                                            maxLength={10}
                                        />
                                        <span className="field-hint">10-cyfrowy numer identyfikacji podatkowej</span>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-actions">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'ksef' && (
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Integracja z KSeF</h2>
                            <p>Krajowy System e-Faktur - API 2.0 (od lutego 2026)</p>
                        </div>

                        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                            📢 <strong>KSeF API 2.0</strong> - Od 2 lutego 2026 obowiązuje nowa wersja API. System został zaktualizowany do wersji 2.0.
                        </div>

                        {!formData.firma_nip && (
                            <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
                                ⚠️ <strong>Wymagany NIP!</strong> Przed konfiguracją KSeF, przejdź do zakładki "Firma" i wprowadź NIP firmy.
                            </div>
                        )}

                        {message && (
                            <div className={`alert alert-${message.type}`}>{message.text}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="settings-card">
                                {formData.firma_nip && (
                                    <div className="settings-row" style={{ marginBottom: '20px' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>NIP firmy: </span>
                                            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formData.firma_nip}</strong>
                                        </div>
                                    </div>
                                )}
                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>Srodowisko KSeF</label>
                                        <select
                                            className="form-control"
                                            value={formData.ksef_environment}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                ksef_environment: e.target.value as 'production' | 'test' | 'demo' 
                                            })}
                                        >
                                            <option value="demo">🧪 Demo (api-demo.ksef.mf.gov.pl) - do nauki i testów</option>
                                            <option value="test">🔬 Test (api-test.ksef.mf.gov.pl) - środowisko testowe MF</option>
                                            <option value="production">🏢 Produkcja (api.ksef.mf.gov.pl) - prawdziwe faktury</option>
                                        </select>
                                        {formData.ksef_environment === 'production' && (
                                            <div className="field-warning">
                                                 Uwaga: Operacje w srodowisku produkcyjnym sa nieodwracalne
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>
                                            Token autoryzacyjny
                                            {settings?.has_ksef_token && (
                                                <span className="token-status configured"> Skonfigurowany</span>
                                            )}
                                        </label>
                                        <textarea
                                            className="form-control mono"
                                            value={formData.ksef_token}
                                            onChange={(e) => setFormData({ ...formData, ksef_token: e.target.value })}
                                            placeholder={settings?.has_ksef_token 
                                                ? "Token jest juz skonfigurowany. Wklej nowy, aby nadpisac..."
                                                : "Wklej token autoryzacyjny z KSeF..."}
                                            rows={4}
                                        />
                                        <span className="field-hint">
                                            Token jest szyfrowany i bezpiecznie przechowywany.{' '}
                                            <a href="https://ksef.mf.gov.pl" target="_blank" rel="noopener noreferrer">
                                                Wygeneruj token w panelu KSeF
                                            </a>
                                        </span>
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-field checkbox-field">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.auto_fetch_ksef}
                                                onChange={(e) => setFormData({ ...formData, auto_fetch_ksef: e.target.checked })}
                                            />
                                            <span className="checkbox-text">
                                                <strong>Automatyczne pobieranie faktur</strong>
                                                <small>System bedzie regularnie sprawdzac nowe faktury w KSeF</small>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-actions">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Zapisywanie...' : 'Zapisz konfiguracje KSeF'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Bezpieczenstwo</h2>
                            <p>Zarzadzanie haslem i bezpieczenstwem konta</p>
                        </div>

                        <div className="settings-card">
                            <h3 className="card-section-title">Twoje konto</h3>
                            <div className="account-info">
                                <div className="account-avatar">
                                    {currentUser?.first_name?.[0] || currentUser?.username?.[0] || '?'}
                                </div>
                                <div className="account-details">
                                    <div className="account-name">
                                        {currentUser?.first_name} {currentUser?.last_name || currentUser?.username}
                                    </div>
                                    <div className="account-email">{currentUser?.email || 'Brak adresu email'}</div>
                                    <div className="account-meta">
                                        Nazwa uzytkownika: <strong>{currentUser?.username}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3 className="card-section-title">Zmiana hasla</h3>
                            
                            {passwordMessage && (
                                <div className={`alert alert-${passwordMessage.type}`}>{passwordMessage.text}</div>
                            )}

                            <form onSubmit={handleChangePassword}>
                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>Aktualne haslo</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.current_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>Nowe haslo</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.new_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                        />
                                        {passwordData.new_password && (
                                            <div className="password-strength">
                                                <div className="strength-bar">
                                                    <div 
                                                        className="strength-fill" 
                                                        style={{ 
                                                            width: `${(passwordStrength / 5) * 100}%`,
                                                            backgroundColor: getPasswordStrengthColor()
                                                        }}
                                                    />
                                                </div>
                                                <span className="strength-label" style={{ color: getPasswordStrengthColor() }}>
                                                    {getPasswordStrengthLabel()}
                                                </span>
                                            </div>
                                        )}
                                        <span className="field-hint">
                                            Minimum 8 znakow. Uzyj wielkich liter, cyfr i znakow specjalnych.
                                        </span>
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-field">
                                        <label>Powtorz nowe haslo</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.confirm_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                            required
                                            autoComplete="new-password"
                                        />
                                        {passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                                            <div className="field-error">Hasla nie sa identyczne</div>
                                        )}
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={changingPassword || passwordStrength < 2}
                                    >
                                        {changingPassword ? 'Zmieniam haslo...' : 'Zmien haslo'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="settings-card security-info">
                            <h3 className="card-section-title"> Zabezpieczenia systemu</h3>
                            <ul className="security-features">
                                <li>
                                    <span className="feature-icon"></span>
                                    <span>Szyfrowane polaczenie HTTPS</span>
                                </li>
                                <li>
                                    <span className="feature-icon"></span>
                                    <span>Token KSeF szyfrowany AES-256</span>
                                </li>
                                <li>
                                    <span className="feature-icon"></span>
                                    <span>Hasla hashowane (bcrypt)</span>
                                </li>
                                <li>
                                    <span className="feature-icon"></span>
                                    <span>Sesje JWT z automatycznym odswiezaniem</span>
                                </li>
                                <li>
                                    <span className="feature-icon"></span>
                                    <span>Ochrona przed CSRF i XSS</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Zarzadzanie uzytkownikami</h2>
                            <p>Dodawaj i zarzadzaj uzytkownikami systemu</p>
                            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                                + Dodaj uzytkownika
                            </button>
                        </div>

                        {userMessage && (
                            <div className={`alert alert-${userMessage.type}`}>{userMessage.text}</div>
                        )}

                        <div className="settings-card">
                            {loadingUsers ? (
                                <div className="loading"><div className="spinner"></div></div>
                            ) : (
                                <div className="users-list">
                                    {users.map(user => (
                                        <div key={user.id} className="user-item">
                                            <div className="user-avatar">
                                                {user.first_name?.[0] || user.username[0]}
                                            </div>
                                            <div className="user-info">
                                                <div className="user-name">
                                                    {user.first_name} {user.last_name || user.username}
                                                    {user.id === currentUser?.id && (
                                                        <span className="user-badge">Ty</span>
                                                    )}
                                                </div>
                                                <div className="user-meta">
                                                    @{user.username}  {user.email || 'Brak email'}
                                                </div>
                                                <div className="user-date">
                                                    Utworzony: {user.date_joined 
                                                        ? new Date(user.date_joined).toLocaleDateString('pl-PL') 
                                                        : '-'}
                                                </div>
                                            </div>
                                            <div className="user-actions">
                                                {user.id !== currentUser?.id && (
                                                    <button 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                    >
                                                        Usun
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>O aplikacji</h2>
                            <p>Informacje o systemie Fakturex</p>
                        </div>

                        <div className="settings-card about-card">
                            <div className="about-logo">
                                <span className="logo-icon"></span>
                                <h3>Fakturex Next Web</h3>
                                <span className="version-badge">v1.0.0</span>
                            </div>
                            
                            <p className="about-description">
                                Profesjonalny system zarzadzania fakturami kosztowymi z integracja KSeF.
                            </p>

                            <div className="about-features">
                                <div className="feature">
                                    <span className="feature-icon"></span>
                                    <span>Pobieranie faktur z KSeF</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon"></span>
                                    <span>Sledzenie platnosci</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon"></span>
                                    <span>Baza kontrahentow</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon"></span>
                                    <span>Bezpieczne szyfrowanie</span>
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h3 className="card-section-title">Informacje techniczne</h3>
                            <div className="tech-info">
                                <div className="tech-row">
                                    <span>Frontend</span>
                                    <span>React 18 + TypeScript</span>
                                </div>
                                <div className="tech-row">
                                    <span>Backend</span>
                                    <span>Django REST Framework</span>
                                </div>
                                <div className="tech-row">
                                    <span>Baza danych</span>
                                    <span>PostgreSQL</span>
                                </div>
                                <div className="tech-row">
                                    <span>Hosting</span>
                                    <span>Railway</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nowy uzytkownik</h2>
                            <button className="modal-close" onClick={() => setShowUserModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nazwa uzytkownika *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newUserData.username}
                                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                                        required
                                        placeholder="np. jan.kowalski"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Imie</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newUserData.first_name}
                                            onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                                            placeholder="Jan"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nazwisko</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newUserData.last_name}
                                            onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                                            placeholder="Kowalski"
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
                                        placeholder="jan.kowalski@firma.pl"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Haslo *</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={newUserData.password}
                                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                        required
                                        minLength={8}
                                        placeholder="Minimum 8 znakow"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                                    Anuluj
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creatingUser}>
                                    {creatingUser ? 'Tworzenie...' : 'Utworz uzytkownika'}
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
