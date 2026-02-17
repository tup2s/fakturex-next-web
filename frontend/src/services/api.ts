import axios from 'axios';
import { Invoice, InvoiceFormData, Contractor, ContractorFormData, Settings, InvoiceStats } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ FAKTURY ============

export const fetchInvoices = async (params?: { status?: string; overdue?: string; dostawca?: string }): Promise<Invoice[]> => {
  const response = await apiClient.get('/invoices/', { params });
  return response.data;
};

export const fetchInvoiceStats = async (): Promise<InvoiceStats> => {
  const response = await apiClient.get('/invoices/stats/');
  return response.data;
};

export const createInvoice = async (data: InvoiceFormData): Promise<Invoice> => {
  const response = await apiClient.post('/invoices/', data);
  return response.data;
};

export const getInvoice = async (id: number): Promise<Invoice> => {
  const response = await apiClient.get(`/invoices/${id}/`);
  return response.data;
};

export const updateInvoice = async (id: number, data: Partial<InvoiceFormData>): Promise<Invoice> => {
  const response = await apiClient.patch(`/invoices/${id}/`, data);
  return response.data;
};

export const deleteInvoice = async (id: number): Promise<void> => {
  await apiClient.delete(`/invoices/${id}/`);
};

export const markInvoicePaid = async (id: number): Promise<Invoice> => {
  const response = await apiClient.post(`/invoices/${id}/mark_paid/`);
  return response.data;
};

export const markInvoiceUnpaid = async (id: number): Promise<Invoice> => {
  const response = await apiClient.post(`/invoices/${id}/mark_unpaid/`);
  return response.data;
};

// ============ KONTRAHENCI ============

export const fetchContractors = async (search?: string): Promise<Contractor[]> => {
  const response = await apiClient.get('/contractors/', { params: { search } });
  return response.data;
};

export const createContractor = async (data: ContractorFormData): Promise<Contractor> => {
  const response = await apiClient.post('/contractors/', data);
  return response.data;
};

export const getContractor = async (id: number): Promise<Contractor> => {
  const response = await apiClient.get(`/contractors/${id}/`);
  return response.data;
};

export const updateContractor = async (id: number, data: Partial<ContractorFormData>): Promise<Contractor> => {
  const response = await apiClient.patch(`/contractors/${id}/`, data);
  return response.data;
};

export const deleteContractor = async (id: number): Promise<void> => {
  await apiClient.delete(`/contractors/${id}/`);
};

// ============ USTAWIENIA ============

export const fetchSettings = async (): Promise<Settings> => {
  const response = await apiClient.get('/settings/');
  return response.data;
};

export const updateSettings = async (data: Partial<Settings>): Promise<Settings> => {
  const response = await apiClient.patch('/settings/', data);
  return response.data;
};

// ============ UŻYTKOWNICY ============

export const fetchUsers = async () => {
  const response = await apiClient.get('/users/');
  return response.data;
};

export default apiClient;