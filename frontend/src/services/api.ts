import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Invoices
export const fetchInvoices = async () => {
  const response = await apiClient.get('/invoices/');
  return response.data;
};

export const createInvoice = async (invoiceData: any) => {
  const response = await apiClient.post('/invoices/', invoiceData);
  return response.data;
};

export const getInvoice = async (id: number) => {
  const response = await apiClient.get(`/invoices/${id}/`);
  return response.data;
};

export const updateInvoice = async (id: number, invoiceData: any) => {
  const response = await apiClient.put(`/invoices/${id}/`, invoiceData);
  return response.data;
};

export const deleteInvoice = async (id: number) => {
  await apiClient.delete(`/invoices/${id}/`);
};

// Customers
export const fetchCustomers = async () => {
  const response = await apiClient.get('/customers/');
  return response.data;
};

export const createCustomer = async (customerData: any) => {
  const response = await apiClient.post('/customers/', customerData);
  return response.data;
};

export const getCustomer = async (id: number) => {
  const response = await apiClient.get(`/customers/${id}/`);
  return response.data;
};

export const updateCustomer = async (id: number, customerData: any) => {
  const response = await apiClient.put(`/customers/${id}/`, customerData);
  return response.data;
};

export const deleteCustomer = async (id: number) => {
  await apiClient.delete(`/customers/${id}/`);
};

// Products
export const fetchProducts = async () => {
  const response = await apiClient.get('/products/');
  return response.data;
};

export const createProduct = async (productData: any) => {
  const response = await apiClient.post('/products/', productData);
  return response.data;
};

export const getProduct = async (id: number) => {
  const response = await apiClient.get(`/products/${id}/`);
  return response.data;
};

export const updateProduct = async (id: number, productData: any) => {
  const response = await apiClient.put(`/products/${id}/`, productData);
  return response.data;
};

export const deleteProduct = async (id: number) => {
  await apiClient.delete(`/products/${id}/`);
};

// Users
export const fetchUsers = async () => {
  const response = await apiClient.get('/users/');
  return response.data;
};

export default apiClient;