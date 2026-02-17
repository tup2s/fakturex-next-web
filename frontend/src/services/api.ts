import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Example API call to fetch invoices
export const fetchInvoices = async () => {
  try {
    const response = await apiClient.get('/invoices/');
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

// Example API call to create an invoice
export const createInvoice = async (invoiceData) => {
  try {
    const response = await apiClient.post('/invoices/', invoiceData);
    return response.data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Add more API functions as needed

export default {
  fetchInvoices,
  createInvoice,
};