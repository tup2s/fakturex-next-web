import React, { useEffect, useState } from 'react';
import { Contractor, ContractorFormData } from '../types';
import { fetchContractors, createContractor, updateContractor, deleteContractor } from '../services/api';

const emptyForm: ContractorFormData = {
    nazwa: '',
    nip: '',
    ulica: '',
    miasto: '',
    kod_pocztowy: '',
    kraj: 'Polska',
    email: '',
    telefon: '',
    notatki: '',
};

const Contractors: React.FC = () => {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ContractorFormData>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchContractors();
            setContractors(data);
        } catch (error) {
            console.error('Błąd ładowania:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (contractor?: Contractor) => {
        if (contractor) {
            setEditingId(contractor.id);
            setFormData({
                nazwa: contractor.nazwa,
                nip: contractor.nip,
                ulica: contractor.ulica,
                miasto: contractor.miasto,
                kod_pocztowy: contractor.kod_pocztowy,
                kraj: contractor.kraj,
                email: contractor.email,
                telefon: contractor.telefon,
                notatki: contractor.notatki,
            });
        } else {
            setEditingId(null);
            setFormData(emptyForm);
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
            if (editingId) {
                await updateContractor(editingId, formData);
            } else {
                await createContractor(formData);
            }
            handleCloseModal();
            loadData();
        } catch (error) {
            console.error('Błąd zapisywania:', error);
            alert('Wystąpił błąd podczas zapisywania kontrahenta');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Czy na pewno chcesz usunąć tego kontrahenta?')) {
            try {
                await deleteContractor(id);
                loadData();
            } catch (error) {
                console.error('Błąd usuwania:', error);
                alert('Nie można usunąć kontrahenta - może być powiązany z fakturami');
            }
        }
    };

    // Search
    const filteredContractors = contractors.filter(contractor => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                contractor.nazwa.toLowerCase().includes(search) ||
                contractor.nip.toLowerCase().includes(search) ||
                contractor.miasto.toLowerCase().includes(search)
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
                    <h1 className="page-title">Kontrahenci</h1>
                    <p className="page-subtitle">Zarządzaj dostawcami i kontrahentami</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    + Dodaj kontrahenta
                </button>
            </div>

            {/* Wyszukiwarka */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body">
                    <div className="form-group" style={{ margin: 0 }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Szukaj po nazwie, NIP lub mieście..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nazwa</th>
                                <th>NIP</th>
                                <th>Miasto</th>
                                <th>Email</th>
                                <th>Telefon</th>
                                <th style={{ textAlign: 'right' }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContractors.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                            </svg>
                                            <h3>Brak kontrahentów</h3>
                                            <p>Dodaj pierwszego kontrahenta</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredContractors.map((contractor) => (
                                    <tr key={contractor.id}>
                                        <td><strong>{contractor.nazwa}</strong></td>
                                        <td>{contractor.nip || '—'}</td>
                                        <td>{contractor.miasto || '—'}</td>
                                        <td>
                                            {contractor.email ? (
                                                <a href={`mailto:${contractor.email}`} style={{ color: 'var(--accent-blue)' }}>
                                                    {contractor.email}
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td>{contractor.telefon || '—'}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button 
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleOpenModal(contractor)}
                                                >
                                                    Edytuj
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(contractor.id)}
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
                                {editingId ? 'Edytuj kontrahenta' : 'Nowy kontrahent'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nazwa *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.nazwa}
                                        onChange={(e) => setFormData({ ...formData, nazwa: e.target.value })}
                                        placeholder="Nazwa firmy lub osoby"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">NIP</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.nip || ''}
                                        onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                                        placeholder="np. 1234567890"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Ulica</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.ulica || ''}
                                        onChange={(e) => setFormData({ ...formData, ulica: e.target.value })}
                                        placeholder="np. ul. Główna 1"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Kod pocztowy</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.kod_pocztowy || ''}
                                            onChange={(e) => setFormData({ ...formData, kod_pocztowy: e.target.value })}
                                            placeholder="np. 00-000"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Miasto</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.miasto || ''}
                                            onChange={(e) => setFormData({ ...formData, miasto: e.target.value })}
                                            placeholder="np. Warszawa"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={formData.email || ''}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="kontakt@firma.pl"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            value={formData.telefon || ''}
                                            onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                                            placeholder="+48 123 456 789"
                                        />
                                    </div>
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
                                    {editingId ? 'Zapisz zmiany' : 'Dodaj kontrahenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contractors;
