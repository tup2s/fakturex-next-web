"""
Serwis integracji z KSeF (Krajowy System e-Faktur) API 2.0.
Obsługuje pobieranie faktur kosztowych z API KSeF.

UWAGA: Od 2 lutego 2026 KSeF API 1.0 zostało wyłączone.
Ten serwis używa API 2.0 z nowymi endpointami.

Przepływ autoryzacji API 2.0:
1. POST /v2/auth/challenge - pobranie challenge i timestamp
2. Zaszyfrowanie tokena z timestamp (RSA-OAEP)
3. POST /v2/auth/ksef-token - wysłanie zaszyfrowanego tokena
4. GET /v2/auth/{referenceNumber} - sprawdzenie statusu
5. POST /v2/auth/token/redeem - wymiana na access/refresh token
"""
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import json
import base64
import hashlib
import time
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import load_pem_x509_certificate


class KSeFService:
    """
    Serwis do komunikacji z API KSeF 2.0.
    
    Nowe URL-e API 2.0 (z /v2):
    - Production: https://api.ksef.mf.gov.pl/v2
    - Demo: https://api-demo.ksef.mf.gov.pl/v2
    - Test: https://api-test.ksef.mf.gov.pl/v2
    """
    
    # KSeF API 2.0 endpoints (od 02.2026) - z /v2
    ENVIRONMENTS = {
        'production': 'https://api.ksef.mf.gov.pl/v2',
        'test': 'https://api-test.ksef.mf.gov.pl/v2',
        'demo': 'https://api-demo.ksef.mf.gov.pl/v2'
    }
    
    def __init__(self, token: str, nip: str, environment: str = 'test'):
        self.token = token
        self.nip = nip
        self.environment = environment
        self.base_url = self.ENVIRONMENTS.get(environment, self.ENVIRONMENTS['test'])
        self.access_token = None
        self.refresh_token = None
        
    def _get_headers(self, include_auth: bool = True) -> Dict:
        """Nagłówki HTTP dla requestów API 2.0."""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if include_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers
    
    def _get_public_key(self) -> Optional[bytes]:
        """Pobierz klucz publiczny KSeF do szyfrowania tokena."""
        try:
            # Endpoint do pobrania certyfikatów
            url = f"{self.base_url}/security/public-key-certificates"
            response = requests.get(url, headers={'Accept': 'application/json'}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                # Szukamy certyfikatu do szyfrowania tokenów (KsefTokenEncryption)
                for cert in data.get('certificates', []):
                    if cert.get('usage') == 'KsefTokenEncryption':
                        cert_b64 = cert.get('certificate', '')
                        # Dodaj nagłówek/stopkę PEM jeśli nie ma
                        if not cert_b64.startswith('-----'):
                            cert_pem = f"-----BEGIN CERTIFICATE-----\n{cert_b64}\n-----END CERTIFICATE-----"
                            return cert_pem.encode('utf-8')
                        return cert_b64.encode('utf-8')
            return None
        except Exception as e:
            print(f"Błąd pobierania klucza publicznego: {e}")
            return None
    
    def _encrypt_token(self, token: str, timestamp: str) -> Optional[str]:
        """Zaszyfruj token z timestamp używając RSA-OAEP."""
        try:
            # Pobierz klucz publiczny
            public_key_pem = self._get_public_key()
            if not public_key_pem:
                return None
            
            # Parsuj certyfikat i wyciągnij klucz publiczny
            cert = load_pem_x509_certificate(public_key_pem, default_backend())
            public_key = cert.public_key()
            
            # Dane do zaszyfrowania: token|timestamp
            data_to_encrypt = f"{token}|{timestamp}".encode('utf-8')
            
            # Szyfruj RSA-OAEP z SHA-256
            encrypted = public_key.encrypt(
                data_to_encrypt,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            return base64.b64encode(encrypted).decode('utf-8')
        except Exception as e:
            print(f"Błąd szyfrowania tokena: {e}")
            return None
    
    def authorize(self) -> Tuple[bool, str]:
        """
        Autoryzuj sesję w KSeF 2.0 za pomocą tokena.
        
        Przepływ:
        1. Pobierz challenge
        2. Zaszyfruj token z timestamp
        3. Wyślij do /auth/ksef-token
        4. Sprawdź status
        5. Wymień na access token
        
        Zwraca (sukces, komunikat/błąd).
        """
        try:
            # Krok 1: Pobierz challenge
            challenge_url = f"{self.base_url}/auth/challenge"
            challenge_payload = {
                "contextIdentifier": {
                    "type": "nip",
                    "value": self.nip
                }
            }
            
            challenge_response = requests.post(
                challenge_url,
                json=challenge_payload,
                headers=self._get_headers(include_auth=False),
                timeout=30
            )
            
            if challenge_response.status_code not in [200, 201]:
                return False, f"Błąd pobierania challenge (HTTP {challenge_response.status_code}): {challenge_response.text[:200]}"
            
            try:
                challenge_data = challenge_response.json()
            except json.JSONDecodeError:
                return False, f"KSeF zwrócił nieprawidłową odpowiedź challenge: {challenge_response.text[:200]}"
            
            challenge = challenge_data.get('challenge')
            timestamp = challenge_data.get('timestamp')
            
            if not challenge or not timestamp:
                return False, f"Brak challenge lub timestamp w odpowiedzi: {challenge_data}"
            
            # Krok 2: Zaszyfruj token z timestamp
            encrypted_token = self._encrypt_token(self.token, timestamp)
            
            if not encrypted_token:
                # Jeśli szyfrowanie się nie powiodło, spróbuj wysłać token w base64
                # (niektóre środowiska testowe mogą to akceptować)
                encrypted_token = base64.b64encode(f"{self.token}|{timestamp}".encode('utf-8')).decode('utf-8')
            
            # Krok 3: Wyślij token do autoryzacji
            auth_url = f"{self.base_url}/auth/ksef-token"
            
            auth_payload = {
                "contextIdentifier": {
                    "type": "nip", 
                    "value": self.nip
                },
                "encryptedToken": encrypted_token,
                "challenge": challenge
            }
            
            auth_response = requests.post(
                auth_url,
                json=auth_payload,
                headers=self._get_headers(include_auth=False),
                timeout=30
            )
            
            if auth_response.status_code not in [200, 201, 202]:
                return False, f"Błąd autoryzacji KSeF (HTTP {auth_response.status_code}): {auth_response.text[:200]}"
            
            try:
                auth_data = auth_response.json()
            except json.JSONDecodeError:
                return False, f"KSeF zwrócił nieprawidłową odpowiedź auth: {auth_response.text[:200]}"
            
            auth_token = auth_data.get('authenticationToken')
            reference_number = auth_data.get('referenceNumber')
            
            if not reference_number:
                return False, f"Brak referenceNumber w odpowiedzi: {auth_data}"
            
            # Krok 4: Sprawdź status autoryzacji (polling)
            status_url = f"{self.base_url}/auth/{reference_number}"
            max_attempts = 10
            
            for attempt in range(max_attempts):
                time.sleep(1)  # Czekaj sekundę między próbami
                
                status_response = requests.get(
                    status_url,
                    headers={'Authorization': f'Bearer {auth_token}'} if auth_token else {},
                    timeout=30
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    if status_data.get('status') == 200:
                        break
                elif status_response.status_code == 202:
                    continue  # W trakcie przetwarzania
                else:
                    return False, f"Błąd sprawdzania statusu (HTTP {status_response.status_code})"
            
            # Krok 5: Wymień auth token na access token
            redeem_url = f"{self.base_url}/auth/token/redeem"
            
            redeem_response = requests.post(
                redeem_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {auth_token}'
                } if auth_token else self._get_headers(include_auth=False),
                timeout=30
            )
            
            if redeem_response.status_code in [200, 201]:
                try:
                    token_data = redeem_response.json()
                except json.JSONDecodeError:
                    return False, f"KSeF zwrócił nieprawidłową odpowiedź redeem: {redeem_response.text[:200]}"
                
                self.access_token = token_data.get('accessToken') or token_data.get('access_token')
                self.refresh_token = token_data.get('refreshToken') or token_data.get('refresh_token')
                
                if self.access_token:
                    return True, "Autoryzacja udana (KSeF API 2.0)"
                else:
                    return False, f"Brak access token w odpowiedzi: {token_data}"
            else:
                return False, f"Błąd wymiany tokena (HTTP {redeem_response.status_code}): {redeem_response.text[:200]}"
                
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
            # KSeF API 2.0 - endpoint zapytań o faktury
            # base_url już zawiera /v2
            query_url = f"{self.base_url}/invoices/query"
            
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
            url = f"{self.base_url}/invoices/{ksef_number}"
            
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
                # API 2.0 - zakończ bieżącą sesję
                url = f"{self.base_url}/auth/sessions/current"
                requests.delete(url, headers=self._get_headers(), timeout=10)
            except Exception:
                pass
            finally:
                self.access_token = None
                self.refresh_token = None


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
