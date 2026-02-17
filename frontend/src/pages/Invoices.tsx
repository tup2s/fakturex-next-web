import React, { useEffect, useState } from 'react';
import { Invoice, Customer, Product, InvoiceItem, InvoiceFormData } from '../types';
import { fetchInvoices, fetchCustomers, fetchProducts, createInvoice, deleteInvoice } from '../services/api';
import './Pages.css';

const emptyItem: InvoiceItem = {
  description: '',
  quantity: 1,
  unit: 'szt.',
  unit_price: 0,
  tax_rate: 23,
};

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: '',
    customer: null,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    notes: '',
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesData, customersData, productsData] = await Promise.all([
        fetchInvoices(),
        fetchCustomers(),
        fetchProducts(),
      ]);
      setInvoices(invoicesData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Błąd ładowania:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const num = invoices.length + 1;
    return `FV/${year}/${month}/${String(num).padStart(4, '0')}`;
  };

  const handleNewInvoice = () => {
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);

    setFormData({
      invoice_number: generateInvoiceNumber(),
      customer: null,
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      status: 'draft',
      notes: '',
      items: [{ ...emptyItem }],
    });
    setShowForm(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        product: product.id,
        description: product.name,
        unit: product.unit,
        unit_price: product.unit_price,
        tax_rate: product.tax_rate,
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    return item.quantity * item.unit_price;
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTax = () => {
    return formData.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * item.tax_rate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer) {
      alert('Wybierz klienta');
      return;
    }
    try {
      await createInvoice(formData);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Błąd zapisywania:', error);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Szkic',
      issued: 'Wystawiona',
      paid: 'Zapłacona',
      overdue: 'Przeterminowana',
      cancelled: 'Anulowana',
    };
    return labels[status] || status;
  };

  if (loading) return <div className="loading">Ładowanie...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Faktury</h1>
        <button className="btn btn-primary" onClick={handleNewInvoice}>
          + Nowa faktura
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Nowa faktura</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>Numer faktury *</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Klient *</label>
                  <select
                    value={formData.customer || ''}
                    onChange={(e) => setFormData({ ...formData, customer: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">Wybierz klienta...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data wystawienia</label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Termin płatności</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">Szkic</option>
                    <option value="issued">Wystawiona</option>
                    <option value="paid">Zapłacona</option>
                  </select>
                </div>
              </div>

              <h3>Pozycje faktury</h3>
              <div className="invoice-items">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Produkt/Opis</th>
                      <th>Ilość</th>
                      <th>Jedn.</th>
                      <th>Cena netto</th>
                      <th>VAT</th>
                      <th>Wartość</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            style={{ marginBottom: '4px', width: '100%' }}
                          >
                            <option value="">-- wybierz produkt --</option>
                            {products.filter(p => p.is_active).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="lub wpisz opis..."
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            required
                          />
                        </td>
                        <td>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          >
                            <option value="szt.">szt.</option>
                            <option value="kg">kg</option>
                            <option value="m">m</option>
                            <option value="godz.">godz.</option>
                            <option value="usł.">usł.</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                            required
                          />
                        </td>
                        <td>
                          <select
                            value={item.tax_rate}
                            onChange={(e) => handleItemChange(index, 'tax_rate', parseInt(e.target.value))}
                          >
                            <option value={23}>23%</option>
                            <option value={8}>8%</option>
                            <option value={5}>5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>
                        <td className="item-total">
                          {formatPrice(calculateItemTotal(item))}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn btn-secondary" onClick={addItem}>
                  + Dodaj pozycję
                </button>
              </div>

              <div className="invoice-summary">
                <div className="summary-row">
                  <span>Suma netto:</span>
                  <strong>{formatPrice(calculateSubtotal())}</strong>
                </div>
                <div className="summary-row">
                  <span>VAT:</span>
                  <strong>{formatPrice(calculateTax())}</strong>
                </div>
                <div className="summary-row total">
                  <span>Razem brutto:</span>
                  <strong>{formatPrice(calculateTotal())}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Uwagi</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  Zapisz fakturę
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
              <th>Numer</th>
              <th>Klient</th>
              <th>Data wystawienia</th>
              <th>Termin płatności</th>
              <th>Kwota</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">Brak faktur</td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoice_number}</strong></td>
                  <td>{invoice.customer_name}</td>
                  <td>{invoice.issue_date}</td>
                  <td>{invoice.due_date}</td>
                  <td>{formatPrice(invoice.total)}</td>
                  <td>
                    <span className={`status-badge status-${invoice.status}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(invoice.id)}>
                      Usuń
                    </button>
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

export default Invoices;