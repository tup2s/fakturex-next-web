"""
Serwis integracji z KSeF (Krajowy System e-Faktur) API 2.0.
Obsługuje pobieranie faktur kosztowych z API KSeF.

UWAGA: Od 2 lutego 2026 KSeF API 1.0 zostało wyłączone.
Ten serwis używa API 2.0 z nowymi endpointami.
"""
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import json
import base64
import hashlib


class KSeFService:
    """
    Serwis do komunikacji z API KSeF 2.0.
    
    Nowe URL-e API 2.0:
    - Production: https://api.ksef.mf.gov.pl
    - Demo: https://api-demo.ksef.mf.gov.pl
    - Test: https://api-test.ksef.mf.gov.pl
    """
    
    # KSeF API 2.0 endpoints (od 02.2026)
    ENVIRONMENTS = {
        'production': 'https://api.ksef.mf.gov.pl',
        'test': 'https://api-test.ksef.mf.gov.pl',
        'demo': 'https://api-demo.ksef.mf.gov.pl'
    }
    
    def __init__(self, token: str, nip: str, environment: str = 'test'):
        self.token = token
        self.nip = nip
        self.environment = environment
        self.base_url = self.ENVIRONMENTS.get(environment, self.ENVIRONMENTS['test'])
        self.access_token = None
        
    def _get_headers(self, include_auth: bool = True) -> Dict:
        """Nagłówki HTTP dla requestów API 2.0."""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if include_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers
    
    def authorize(self) -> Tuple[bool, str]:
        """
        Autoryzuj sesję w KSeF 2.0 za pomocą tokena.
        API 2.0 używa Bearer token authentication.
        Zwraca (sukces, komunikat/błąd).
        """
        try:
            # KSeF 2.0 - autoryzacja tokenem
            # Endpoint: POST /api/authentication/token
            
            auth_url = f"{self.base_url}/api/authentication/token"
            
            payload = {
                "contextIdentifier": {
                    "type": "nip",
                    "value": self.nip
                },
                "token": self.token
            }
            
            response = requests.post(
                auth_url,
                json=payload,
                headers=self._get_headers(include_auth=False),
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    return False, f"KSeF zwrócił nieprawidłową odpowiedź: {response.text[:200]}"
                
                # W API 2.0 dostajemy access_token bezpośrednio
                self.access_token = data.get('accessToken') or data.get('access_token')
                
                if self.access_token:
                    return True, "Autoryzacja udana (KSeF API 2.0)"
                else:
                    return False, f"Brak tokena w odpowiedzi: {data}"
            else:
                return False, f"Błąd autoryzacji KSeF (HTTP {response.status_code}): {response.text[:200]}"
                
        except requests.exceptions.Timeout:
            return False, "Timeout połączenia z KSeF - serwer nie odpowiada"
        except requests.exceptions.ConnectionError:
            return False, "Nie można połączyć się z KSeF - sprawdź połączenie internetowe"
        except requests.exceptions.RequestException as e:
            return False, f"Błąd połączenia HTTP: {str(e)}"
        except json.JSONDecodeError as e:
            return False, f"Błąd parsowania odpowiedzi KSeF: {str(e)}"
        except Exception as e:
            return False, f"Nieoczekiwany błąd: {str(e)}"
    
    def fetch_invoices(
        self, 
        date_from: str, 
        date_to: str,
        subject_type: str = 'SUBJECT2'  # SUBJECT2 = faktury kosztowe (odbiorca)
    ) -> Tuple[List[Dict], str]:
        """
        Pobierz faktury z KSeF 2.0 za podany okres.
        subject_type: 'SUBJECT1' = wystawione, 'SUBJECT2' = otrzymane (kosztowe)
        Zwraca (lista_faktur, komunikat).
        """
        invoices = []
        
        if not self.access_token:
            success, msg = self.authorize()
            if not success:
                return [], msg
        
        try:
            # KSeF API 2.0 - nowy endpoint zapytań
            query_url = f"{self.base_url}/api/invoices/query"
            
            # Format dat ISO 8601
            date_from_iso = f"{date_from}T00:00:00Z"
            date_to_iso = f"{date_to}T23:59:59Z"
            
            # Payload zgodny z API 2.0
            payload = {
                "queryCriteria": {
                    "subjectType": subject_type,
                    "dateRange": {
                        "dateType": "ISSUE",
                        "from": date_from_iso,
                        "to": date_to_iso
                    }
                },
                "pageSize": 100,
                "pageOffset": 0
            }
            
            response = requests.post(
                query_url,
                json=payload,
                headers=self._get_headers(),
                timeout=60
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    return [], f"KSeF zwrócił nieprawidłową odpowiedź: {response.text[:200]}"
                
                # API 2.0 może używać różnych nazw pól
                invoice_list = data.get('invoiceHeaders', []) or data.get('invoiceHeaderList', []) or data.get('items', [])
                
                for inv in invoice_list:
                    invoice_data = self._parse_invoice_header(inv)
                    if invoice_data:
                        invoices.append(invoice_data)
                
                return invoices, f"Pobrano {len(invoices)} faktur (KSeF API 2.0)"
            else:
                return [], f"Błąd zapytania KSeF (HTTP {response.status_code}): {response.text[:200]}"
                
        except requests.exceptions.Timeout:
            return [], "Timeout zapytania KSeF"
        except requests.exceptions.ConnectionError:
            return [], "Nie można połączyć się z KSeF"
        except Exception as e:
            return [], f"Błąd pobierania faktur: {str(e)}"
    
    def _parse_invoice_header(self, header: Dict) -> Optional[Dict]:
        """Parsuj nagłówek faktury z KSeF API 2.0."""
        try:
            # API 2.0 może używać różnych nazw pól
            ksef_ref = header.get('ksefReferenceNumber') or header.get('referenceNumber', '')
            invoice_ref = header.get('invoiceReferenceNumber') or header.get('invoiceNumber', '')
            issue_date = header.get('invoicingDate') or header.get('issueDate', '')
            
            # Kwoty
            net = Decimal(str(header.get('net', 0) or header.get('netAmount', 0)))
            vat = Decimal(str(header.get('vat', 0) or header.get('vatAmount', 0)))
            
            # Podmiot
            subject_name = header.get('subjectName') or header.get('issuerName', '')
            subject_nip = header.get('subjectNip') or header.get('issuerNip', '')
            
            return {
                'ksef_numer': ksef_ref,
                'numer': invoice_ref,
                'data': issue_date[:10] if issue_date else '',
                'kwota': net + vat,
                'dostawca': subject_name,
                'dostawca_nip': subject_nip,
            }
        except Exception:
            return None
    
    def get_invoice_xml(self, ksef_number: str) -> Tuple[str, str]:
        """
        Pobierz XML faktury z KSeF API 2.0.
        Zwraca (xml_content, komunikat).
        """
        if not self.access_token:
            success, msg = self.authorize()
            if not success:
                return '', msg
        
        try:
            # KSeF API 2.0 - endpoint do pobierania faktury
            url = f"{self.base_url}/api/invoices/{ksef_number}"
            
            response = requests.get(
                url,
                headers={**self._get_headers(), 'Accept': 'application/xml'},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.text, "Pobrano XML (KSeF API 2.0)"
            else:
                return '', f"Błąd pobierania XML: {response.text[:200]}"
                
        except Exception as e:
            return '', f"Błąd: {str(e)}"
    
    def terminate_session(self):
        """Zakończ sesję KSeF API 2.0."""
        if self.access_token:
            try:
                # W API 2.0 tokeny są ważne do wygaśnięcia, 
                # ale możemy wywołać logout jeśli jest dostępny
                url = f"{self.base_url}/api/authentication/logout"
                requests.post(url, headers=self._get_headers(), timeout=10)
            except Exception:
                pass
            finally:
                self.access_token = None


def fetch_invoices_from_ksef(
    token: str,
    nip: str,
    environment: str,
    date_from: str = None,
    date_to: str = None
) -> Tuple[List[Dict], str]:
    """
    Wrapper do pobierania faktur z KSeF API 2.0.
    
    Args:
        token: Token autoryzacji KSeF
        nip: NIP firmy
        environment: 'production', 'demo', lub 'test'
        date_from: Data początkowa (YYYY-MM-DD)
        date_to: Data końcowa (YYYY-MM-DD)
    
    Returns:
        Tuple[List[Dict], str]: Lista faktur i komunikat
    """
    if not date_from:
        date_from = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not date_to:
        date_to = datetime.now().strftime('%Y-%m-%d')
    
    service = KSeFService(token, nip, environment)
    
    try:
        invoices, message = service.fetch_invoices(date_from, date_to)
        return invoices, message
    finally:
        service.terminate_session()
