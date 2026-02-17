import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/api';
import './Pages.css';

const emptyCustomer: Partial<Customer> = {
  customer_type: 'company',
  company_name: '',
  first_name: '',
  last_name: '',
  nip: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  postal_code: '',
  country: 'Polska',
  notes: '',
};

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>(emptyCustomer);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Błąd ładowania klientów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer?.id) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      setShowForm(false);
      setEditingCustomer(null);
      setFormData(emptyCustomer);
      loadCustomers();
    } catch (error) {
      console.error('Błąd zapisywania:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego klienta?')) {
      try {
        await deleteCustomer(id);
        loadCustomers();
      } catch (error) {
        console.error('Błąd usuwania:', error);
      }
    }
  };

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    setFormData(emptyCustomer);
    setShowForm(true);
  };

  if (loading) return <div className="loading">Ładowanie...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Klienci</h1>
        <button className="btn btn-primary" onClick={handleNewCustomer}>
          + Nowy klient
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingCustomer?.id ? 'Edytuj klienta' : 'Nowy klient'}</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label>Typ klienta</label>
                <select
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as 'individual' | 'company' })}
                >
                  <option value="company">Firma</option>
                  <option value="individual">Osoba fizyczna</option>
                </select>
              </div>

              {formData.customer_type === 'company' && (
                <>
                  <div className="form-group">
                    <label>Nazwa firmy *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>NIP</label>
                    <input
                      type="text"
                      value={formData.nip}
                      onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                      placeholder="000-000-00-00"
                    />
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Imię</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Nazwisko</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ulica</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kod pocztowy</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="00-000"
                  />
                </div>
                <div className="form-group">
                  <label>Miasto</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notatki</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer?.id ? 'Zapisz zmiany' : 'Dodaj klienta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>NIP</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Miasto</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">Brak klientów</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.display_name}</strong></td>
                  <td>{customer.nip || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.city || '-'}</td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => handleEdit(customer)}>Edytuj</button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(customer.id)}>Usuń</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;