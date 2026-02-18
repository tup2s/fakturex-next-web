import axios from 'axios';
import { Invoice, InvoiceFormData, Contractor, ContractorFormData, Settings, InvoiceStats, User, AuthTokens } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor - dodaj token do każdego requestu
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor - auto-refresh tokenu przy 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
            { refresh: refreshToken }
          );
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - wyloguj użytkownika
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ============ AUTENTYKACJA ============

export const login = async (username: string, password: string): Promise<{ user: User; tokens: AuthTokens }> => {
  const response = await apiClient.post('/auth/login/', { username, password });
  const { access, refresh, user } = response.data;
  
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  localStorage.setItem('user', JSON.stringify(user));
  
  return { user, tokens: { access, refresh } };
};

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refresh_token');
  try {
    await apiClient.post('/auth/logout/', { refresh: refreshToken });
  } catch (error) {
    // Ignoruj błędy wylogowania
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const fetchCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

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

export const fetchFromKSeF = async (dateFrom?: string, dateTo?: string): Promise<{
  message: string;
  info?: string;
  settings_configured: boolean;
  environment?: string;
  nip?: string;
  imported_count: number;
  error?: string;
}> => {
  const response = await apiClient.post('/invoices/fetch_from_ksef/', {
    date_from: dateFrom,
    date_to: dateTo
  });
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

export const changePassword = async (data: { current_password: string; new_password: string; confirm_password: string }): Promise<void> => {
  await apiClient.post('/auth/change-password/', data);
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await apiClient.get('/auth/users/');
  return response.data;
};

export const createUser = async (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }): Promise<User> => {
  const response = await apiClient.post('/auth/users/create/', data);
  return response.data;
};

export const deleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/auth/users/${userId}/delete/`);
};

export default apiClient;