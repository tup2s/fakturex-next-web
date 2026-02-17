// Klient
export interface Customer {
  id: number;
  customer_type: 'individual' | 'company';
  company_name: string;
  first_name: string;
  last_name: string;
  nip: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
  display_name: string;
  full_address: string;
  created_at: string;
  updated_at: string;
}

// Produkt/Usługa
export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  unit: string;
  unit_price: number;
  tax_rate: number;
  tax_rate_display: string;
  price_gross: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pozycja faktury
export interface InvoiceItem {
  id?: number;
  product?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: number;
  total?: number;
  tax_amount?: number;
}

// Faktura
export interface Invoice {
  id: number;
  invoice_number: string;
  customer: number;
  customer_name: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
}

// Formularz tworzenia faktury
export interface InvoiceFormData {
  invoice_number: string;
  customer: number | null;
  issue_date: string;
  due_date: string;
  status: string;
  notes: string;
  items: InvoiceItem[];
}

// Użytkownik
export interface User {
  id: number;
  username: string;
  email: string;
}