/**
 * Typy dla aplikacji Fakturex Next Web
 * Zarządzanie fakturami kosztowymi
 */

// Faktura kosztowa (od dostawcy)
export interface Invoice {
  id: number;
  numer: string;
  data: string;
  kwota: number;
  dostawca: string;
  termin_platnosci: string;
  status: 'niezaplacona' | 'zaplacona';
  kontrahent: number | null;
  kontrahent_nazwa: string | null;
  ksef_numer: string;
  notatki: string;
  is_overdue: boolean;
  days_until_due: number;
  created_at: string;
  updated_at: string;
}

// Formularz faktury
export interface InvoiceFormData {
  numer: string;
  data: string;
  kwota: number | string;
  dostawca: string;
  termin_platnosci: string;
  status: 'niezaplacona' | 'zaplacona';
  kontrahent?: number | null;
  ksef_numer?: string;
  notatki?: string;
}

// Kontrahent/Dostawca
export interface Contractor {
  id: number;
  nazwa: string;
  nip: string;
  ulica: string;
  miasto: string;
  kod_pocztowy: string;
  kraj: string;
  email: string;
  telefon: string;
  notatki: string;
  pelny_adres: string;
  created_at: string;
  updated_at: string;
}

// Formularz kontrahenta
export interface ContractorFormData {
  nazwa: string;
  nip?: string;
  ulica?: string;
  miasto?: string;
  kod_pocztowy?: string;
  kraj?: string;
  email?: string;
  telefon?: string;
  notatki?: string;
}

// Ustawienia firmy
export interface Settings {
  id: number;
  firma_nazwa: string;
  firma_nip: string;
  ksef_token: string;
  ksef_environment: 'production' | 'test' | 'demo';
  auto_fetch_ksef: boolean;
  created_at: string;
  updated_at: string;
}

// Statystyki dla dashboardu
export interface InvoiceStats {
  total_count: number;
  zaplacone_count: number;
  niezaplacone_count: number;
  przeterminowane_count: number;
  blisko_terminu_count: number;
  suma_wszystkich: number;
  suma_zaplaconych: number;
  suma_niezaplaconych: number;
  suma_przeterminowanych: number;
}

// Użytkownik
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

// Tokeny JWT
export interface AuthTokens {
  access: string;
  refresh: string;
}