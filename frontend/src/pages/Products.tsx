import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../services/api';
import './Pages.css';

const emptyProduct: Partial<Product> = {
  code: '',
  name: '',
  description: '',
  unit: 'szt.',
  unit_price: 0,
  tax_rate: 23,
  is_active: true,
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>(emptyProduct);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Błąd ładowania produktów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct?.id) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      setShowForm(false);
      setEditingProduct(null);
      setFormData(emptyProduct);
      loadProducts();
    } catch (error) {
      console.error('Błąd zapisywania:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten produkt?')) {
      try {
        await deleteProduct(id);
        loadProducts();
      } catch (error) {
        console.error('Błąd usuwania:', error);
      }
    }
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setShowForm(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);
  };

  if (loading) return <div className="loading">Ładowanie...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Produkty i usługi</h1>
        <button className="btn btn-primary" onClick={handleNewProduct}>
          + Nowy produkt
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingProduct?.id ? 'Edytuj produkt' : 'Nowy produkt'}</h2>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>Kod produktu</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Nazwa *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Opis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cena netto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Jednostka</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="szt.">Sztuka</option>
                    <option value="kg">Kilogram</option>
                    <option value="m">Metr</option>
                    <option value="m2">Metr kw.</option>
                    <option value="l">Litr</option>
                    <option value="godz.">Godzina</option>
                    <option value="usł.">Usługa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Stawka VAT</label>
                  <select
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseInt(e.target.value) })}
                  >
                    <option value={23}>23%</option>
                    <option value={8}>8%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0%</option>
                    <option value={-1}>zw.</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Aktywny
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct?.id ? 'Zapisz zmiany' : 'Dodaj produkt'}
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
              <th>Kod</th>
              <th>Nazwa</th>
              <th>Cena netto</th>
              <th>VAT</th>
              <th>Cena brutto</th>
              <th>Jednostka</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">Brak produktów</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className={!product.is_active ? 'inactive' : ''}>
                  <td>{product.code || '-'}</td>
                  <td><strong>{product.name}</strong></td>
                  <td>{formatPrice(product.unit_price)}</td>
                  <td>{product.tax_rate_display}</td>
                  <td>{formatPrice(product.price_gross)}</td>
                  <td>{product.unit}</td>
                  <td>
                    <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                      {product.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-small" onClick={() => handleEdit(product)}>Edytuj</button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(product.id)}>Usuń</button>
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

export default Products;