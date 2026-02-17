export interface Invoice {
  id: number;
  customerId: number;
  date: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}