"""
Serwis integracji z KSeF (Krajowy System e-Faktur).
Obsługuje pobieranie faktur kosztowych z API KSeF.
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
    Serwis do komunikacji z API KSeF.
    """
    
    ENVIRONMENTS = {
        'production': 'https://ksef.mf.gov.pl/api',
        'test': 'https://ksef-test.mf.gov.pl/api',
        'demo': 'https://ksef-demo.mf.gov.pl/api'
    }
    
    def __init__(self, token: str, nip: str, environment: str = 'test'):
        self.token = token
        self.nip = nip
        self.environment = environment
        self.base_url = self.ENVIRONMENTS.get(environment, self.ENVIRONMENTS['test'])
        self.session_token = None
        
    def _get_headers(self) -> Dict:
        """Nagłówki HTTP dla requestów."""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if self.session_token:
            headers['SessionToken'] = self.session_token
        return headers
    
    def authorize(self) -> Tuple[bool, str]:
        """
        Autoryzuj sesję w KSeF za pomocą tokena.
        Zwraca (sukces, komunikat/błąd).
        """
        try:
            # KSeF używa autoryzacji tokenem
            # Token może być certyfikatem lub autoryzacją podpisem
            
            auth_url = f"{self.base_url}/online/Session/AuthorisationChallenge"
            
            payload = {
                "contextIdentifier": {
                    "type": "onip",
                    "identifier": self.nip
                }
            }
            
            response = requests.post(
                auth_url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                challenge = data.get('challenge')
                
                # Podpisz challenge tokenem
                init_url = f"{self.base_url}/online/Session/InitToken"
                
                init_payload = {
                    "context": {
                        "contextIdentifier": {
                            "type": "onip",
                            "identifier": self.nip
                        },
                        "credentialsRoleList": [
                            {
                                "type": "token",
                                "roleType": "credentials_read"
                            }
                        ]
                    },
                    "token": self.token
                }
                
                init_response = requests.post(
                    init_url,
                    json=init_payload,
                    headers=self._get_headers(),
                    timeout=30
                )
                
                if init_response.status_code == 201:
                    session_data = init_response.json()
                    self.session_token = session_data.get('sessionToken', {}).get('token')
                    return True, "Autoryzacja udana"
                else:
                    return False, f"Błąd inicjalizacji sesji: {init_response.text}"
            else:
                return False, f"Błąd autoryzacji: {response.text}"
                
        except requests.exceptions.Timeout:
            return False, "Timeout połączenia z KSeF"
        except requests.exceptions.RequestException as e:
            return False, f"Błąd połączenia: {str(e)}"
        except Exception as e:
            return False, f"Nieoczekiwany błąd: {str(e)}"
    
    def fetch_invoices(
        self, 
        date_from: str, 
        date_to: str,
        subject_type: str = 'subject2'  # subject2 = faktury kosztowe (odbiorca)
    ) -> Tuple[List[Dict], str]:
        """
        Pobierz faktury z KSeF za podany okres.
        subject_type: 'subject1' = wystawione, 'subject2' = otrzymane (kosztowe)
        Zwraca (lista_faktur, komunikat).
        """
        invoices = []
        
        if not self.session_token:
            success, msg = self.authorize()
            if not success:
                return [], msg
        
        try:
            query_url = f"{self.base_url}/online/Query/Invoice/Sync"
            
            # Format dat ISO
            date_from_iso = f"{date_from}T00:00:00Z"
            date_to_iso = f"{date_to}T23:59:59Z"
            
            payload = {
                "queryCriteria": {
                    "subjectType": subject_type,
                    "acquisitionTimestampThresholdFrom": date_from_iso,
                    "acquisitionTimestampThresholdTo": date_to_iso
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
                data = response.json()
                invoice_list = data.get('invoiceHeaderList', [])
                
                for inv in invoice_list:
                    invoice_data = self._parse_invoice_header(inv)
                    if invoice_data:
                        invoices.append(invoice_data)
                
                return invoices, f"Pobrano {len(invoices)} faktur"
            else:
                return [], f"Błąd zapytania: {response.text}"
                
        except Exception as e:
            return [], f"Błąd pobierania faktur: {str(e)}"
    
    def _parse_invoice_header(self, header: Dict) -> Optional[Dict]:
        """Parsuj nagłówek faktury z KSeF."""
        try:
            return {
                'ksef_numer': header.get('ksefReferenceNumber', ''),
                'numer': header.get('invoiceReferenceNumber', ''),
                'data': header.get('invoicingDate', '')[:10] if header.get('invoicingDate') else '',
                'kwota': Decimal(str(header.get('net', 0))) + Decimal(str(header.get('vat', 0))),
                'dostawca': header.get('subjectName', ''),
                'dostawca_nip': header.get('subjectNip', ''),
            }
        except Exception:
            return None
    
    def get_invoice_xml(self, ksef_number: str) -> Tuple[str, str]:
        """
        Pobierz XML faktury z KSeF.
        Zwraca (xml_content, komunikat).
        """
        if not self.session_token:
            success, msg = self.authorize()
            if not success:
                return '', msg
        
        try:
            url = f"{self.base_url}/online/Invoice/Get/{ksef_number}"
            
            response = requests.get(
                url,
                headers={**self._get_headers(), 'Accept': 'application/octet-stream'},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.text, "Pobrano XML"
            else:
                return '', f"Błąd pobierania XML: {response.text}"
                
        except Exception as e:
            return '', f"Błąd: {str(e)}"
    
    def terminate_session(self):
        """Zakończ sesję KSeF."""
        if self.session_token:
            try:
                url = f"{self.base_url}/online/Session/Terminate"
                requests.get(url, headers=self._get_headers(), timeout=10)
            except Exception:
                pass
            finally:
                self.session_token = None


def fetch_invoices_from_ksef(
    token: str,
    nip: str,
    environment: str,
    date_from: str = None,
    date_to: str = None
) -> Tuple[List[Dict], str]:
    """
    Wrapper do pobierania faktur z KSeF.
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
