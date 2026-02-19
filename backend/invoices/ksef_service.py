"""
Serwis integracji z KSeF (Krajowy System e-Faktur) API 2.0.
Wykorzystuje bibliotekę ksef2 do obsługi API.

UWAGA: Od 2 lutego 2026 KSeF API 1.0 zostało wyłączone.
Ten serwis używa ksef2 SDK dla API 2.0.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import logging

try:
    from ksef2 import Client, Environment
    from ksef2.domain.models import (
        InvoiceQueryFilters, 
        InvoiceSubjectType, 
        InvoiceQueryDateRange, 
        DateType,
    )
    KSEF2_AVAILABLE = True
except ImportError:
    KSEF2_AVAILABLE = False
    logging.warning("ksef2 package not installed. KSeF functionality will be limited.")

# Fallback do starej implementacji gdy ksef2 niedostępne
import requests
import json
import base64
import time

logger = logging.getLogger(__name__)


def get_environment(env_name: str):
    """Mapuj nazwę środowiska na obiekt Environment z ksef2."""
    if not KSEF2_AVAILABLE:
        return env_name
    
    env_map = {
        'production': Environment.PRODUCTION,
        'demo': Environment.DEMO,
        'test': Environment.TEST,
    }
    return env_map.get(env_name, Environment.TEST)


class KSeFService:
    """
    Serwis do komunikacji z API KSeF 2.0.
    Wykorzystuje bibliotekę ksef2 do obsługi autoryzacji i pobierania faktur.
    """
    
    # URL-e fallback gdy ksef2 niedostępne
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
        
        # ksef2 client i auth
        self._client = None
        self._auth = None
        self.access_token = None
    
    def authorize(self) -> Tuple[bool, str]:
        """
        Autoryzuj sesję w KSeF 2.0 za pomocą tokena.
        Wykorzystuje ksef2 SDK jeśli dostępne.
        """
        if KSEF2_AVAILABLE:
            return self._authorize_with_ksef2()
        else:
            return self._authorize_fallback()
    
    def _authorize_with_ksef2(self) -> Tuple[bool, str]:
        """Autoryzacja z użyciem biblioteki ksef2."""
        try:
            env = get_environment(self.environment)
            
            # Wyczyść NIP - usuń myślniki i spacje 
            clean_nip = self.nip.replace('-', '').replace(' ', '').strip()
            # Wyczyść token - usuń whitespace i newlines
            clean_token = self.token.strip().replace('\n', '').replace('\r', '').replace(' ', '')
            
            logger.info(f"KSeF auth: env={self.environment}, env_obj={env}, nip={clean_nip} (len={len(clean_nip)}), token_len={len(clean_token)}, token_first10={clean_token[:10]}...")
            
            self._client = Client(env)
            
            # Token authentication
            self._auth = self._client.auth.authenticate_token(
                ksef_token=clean_token,
                nip=clean_nip
            )
            
            self.access_token = self._auth.access_token
            logger.info(f"KSeF auth SUCCESS: got access_token")
            return True, "Autoryzacja udana (ksef2 SDK, API 2.0)"
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Błąd autoryzacji ksef2: {error_msg}")
            logger.error(f"Exception type: {type(e).__name__}")
            
            # Spróbuj wyciągnąć bardziej szczegółowy komunikat
            if hasattr(e, 'response'):
                try:
                    resp = e.response
                    logger.error(f"Response status: {resp.status_code if hasattr(resp, 'status_code') else 'N/A'}")
                    logger.error(f"Response body: {resp.text if hasattr(resp, 'text') else resp}")
                except:
                    pass
            
            if "401" in error_msg:
                return False, "Błąd autoryzacji (401): Token jest nieprawidłowy lub wygasł. Wygeneruj nowy token w portalu KSeF."
            elif "403" in error_msg:
                return False, "Brak dostępu (403): Token nie ma uprawnień do tego NIP."
            elif "404" in error_msg:
                return False, f"Nie znaleziono (404): Sprawdź poprawność NIP i środowisko. Używasz: {self.environment}, URL: {self.base_url}. Błąd: {error_msg[:300]}"
            else:
                return False, f"Błąd autoryzacji KSeF ({type(e).__name__}): {error_msg[:300]}"
    
    def _authorize_fallback(self) -> Tuple[bool, str]:
        """Fallback autoryzacji gdy ksef2 niedostępne."""
        try:
            # Pobierz challenge
            challenge_url = f"{self.base_url}/auth/challenge"
            challenge_response = requests.post(
                challenge_url,
                json={"contextIdentifier": {"type": "nip", "value": self.nip}},
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
                timeout=30
            )
            
            if challenge_response.status_code not in [200, 201]:
                return False, f"Błąd challenge (HTTP {challenge_response.status_code}): {challenge_response.text[:200]}"
            
            challenge_data = challenge_response.json()
            challenge = challenge_data.get('challenge')
            timestamp = challenge_data.get('timestamp')
            
            if not challenge or not timestamp:
                return False, f"Brak challenge/timestamp: {challenge_data}"
            
            # Prosty base64 encoding tokena (dla testów)
            encrypted_token = base64.b64encode(f"{self.token}|{timestamp}".encode()).decode()
            
            # Wyślij token
            auth_response = requests.post(
                f"{self.base_url}/auth/ksef-token",
                json={
                    "contextIdentifier": {"type": "nip", "value": self.nip},
                    "encryptedToken": encrypted_token,
                    "challenge": challenge
                },
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if auth_response.status_code not in [200, 201, 202]:
                return False, f"Błąd autoryzacji (HTTP {auth_response.status_code}): {auth_response.text[:200]}"
            
            auth_data = auth_response.json()
            auth_token = auth_data.get('authenticationToken')
            
            if not auth_token:
                return False, "Brak authenticationToken w odpowiedzi"
            
            # Wymiana na access token
            redeem_response = requests.post(
                f"{self.base_url}/auth/token/redeem",
                headers={'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'},
                timeout=30
            )
            
            if redeem_response.status_code in [200, 201]:
                token_data = redeem_response.json()
                self.access_token = token_data.get('accessToken') or token_data.get('access_token')
                if self.access_token:
                    return True, "Autoryzacja udana (fallback, API 2.0)"
            
            return False, f"Błąd wymiany tokena: {redeem_response.text[:200]}"
            
        except Exception as e:
            return False, f"Błąd autoryzacji: {str(e)}"
    
    def fetch_invoices(
        self, 
        date_from: str, 
        date_to: str,
        subject_type: str = 'SUBJECT2'
    ) -> Tuple[List[Dict], str]:
        """
        Pobierz faktury z KSeF 2.0 za podany okres.
        subject_type: 'SUBJECT1' = wystawione, 'SUBJECT2' = otrzymane (kosztowe)
        """
        logger.info(f"fetch_invoices: KSEF2_AVAILABLE={KSEF2_AVAILABLE}, _auth={self._auth is not None}, _client={self._client is not None}")
        
        if KSEF2_AVAILABLE and self._auth:
            logger.info("fetch_invoices: using ksef2 SDK path")
            return self._fetch_with_ksef2(date_from, date_to, subject_type)
        else:
            logger.warning(f"fetch_invoices: using fallback path (KSEF2={KSEF2_AVAILABLE}, auth={self._auth})")
            return self._fetch_fallback(date_from, date_to, subject_type)
    
    def _fetch_with_ksef2(
        self, 
        date_from: str, 
        date_to: str,
        subject_type: str
    ) -> Tuple[List[Dict], str]:
        """Pobieranie faktur z ksef2 SDK."""
        try:
            from ksef2.domain.models import FormSchema
            
            logger.info(f"KSeF fetch: opening online session for export, dates={date_from} to {date_to}")
            
            # Otwórz sesję online do eksportu
            with self._client.sessions.open_online(
                access_token=self._auth.access_token,
                form_code=FormSchema.FA3,
            ) as session:
                
                logger.info(f"KSeF fetch: session opened, preparing filters")
                
                # Przygotuj filtry
                from_dt = datetime.strptime(date_from, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                to_dt = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                
                subj_type = InvoiceSubjectType.SUBJECT2 if subject_type == 'SUBJECT2' else InvoiceSubjectType.SUBJECT1
                
                filters = InvoiceQueryFilters(
                    subject_type=subj_type,
                    date_range=InvoiceQueryDateRange(
                        date_type=DateType.ISSUE,
                        from_=from_dt,
                        to=to_dt,
                    ),
                )
                
                logger.info(f"KSeF fetch: scheduling export with filters")
                
                # Zaplanuj eksport
                export = session.schedule_invoices_export(filters=filters)
                
                logger.info(f"KSeF fetch: export scheduled, ref={export.reference_number}, waiting for completion...")
                
                # Poczekaj na gotowość eksportu - polling z timeout
                import time
                max_wait_seconds = 120
                poll_interval = 3
                elapsed = 0
                export_result = None
                
                while elapsed < max_wait_seconds:
                    export_result = session.get_export_status(
                        reference_number=export.reference_number
                    )
                    
                    # Sprawdź czy eksport jest gotowy (ma pakiet)
                    if export_result.package:
                        logger.info(f"KSeF fetch: export ready after {elapsed}s, package available")
                        break
                    
                    # Sprawdź status jeśli dostępny
                    status = getattr(export_result, 'status', None) or getattr(export_result, 'processing_status', None)
                    logger.info(f"KSeF fetch: waiting... elapsed={elapsed}s, status={status}, package={export_result.package}")
                    
                    # Jeśli status to błąd lub zakończony bez danych
                    if status and str(status).upper() in ['ERROR', 'FAILED', 'FINISHED']:
                        if not export_result.package:
                            logger.warning(f"KSeF fetch: export finished but no package, status={status}")
                            break
                    
                    time.sleep(poll_interval)
                    elapsed += poll_interval
                
                if not export_result:
                    return [], "Błąd: brak odpowiedzi eksportu"
                
                logger.info(f"KSeF fetch: export status received, has_package={export_result.package is not None}")
                
                invoices = []
                if export_result.package:
                    # Pobierz pakiet - użyj tempfile dla cross-platform
                    import tempfile
                    import os
                    temp_dir = tempfile.mkdtemp(prefix='ksef_export_')
                    logger.info(f"KSeF fetch: downloading package to {temp_dir}")
                    
                    for path in session.fetch_package(
                        package=export_result.package, 
                        target_directory=temp_dir
                    ):
                        logger.info(f"KSeF fetch: downloaded file {path}")
                        # Parsuj pobrany plik
                        invoices.extend(self._parse_export_file(path))
                    
                    # Spróbuj posprzątać
                    try:
                        import shutil
                        shutil.rmtree(temp_dir)
                    except Exception as cleanup_err:
                        logger.warning(f"Could not clean up temp dir: {cleanup_err}")
                
                logger.info(f"KSeF fetch: SUCCESS, parsed {len(invoices)} invoices")
                return invoices, f"Pobrano {len(invoices)} faktur (ksef2 SDK)"
                
        except Exception as e:
            logger.error(f"Błąd pobierania z ksef2: {e}", exc_info=True)
            # Zwróć komunikat błędu zamiast fallback do nieistniejącego API
            return [], f"Błąd pobierania faktur: {str(e)[:200]}"
    
    def _fetch_fallback(
        self, 
        date_from: str, 
        date_to: str,
        subject_type: str
    ) -> Tuple[List[Dict], str]:
        """Fallback pobierania faktur."""
        invoices = []
        
        if not self.access_token:
            success, msg = self.authorize()
            if not success:
                return [], msg
        
        try:
            query_url = f"{self.base_url}/invoices/query"
            
            logger.info(f"KSeF fallback: calling {query_url}")
            
            payload = {
                "queryCriteria": {
                    "subjectType": subject_type,
                    "dateRange": {
                        "dateType": "ISSUE",
                        "from": f"{date_from}T00:00:00Z",
                        "to": f"{date_to}T23:59:59Z"
                    }
                },
                "pageSize": 100,
                "pageOffset": 0
            }
            
            logger.info(f"KSeF fallback: payload={payload}")
            
            response = requests.post(
                query_url,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': f'Bearer {self.access_token}'
                },
                timeout=60
            )
            
            logger.info(f"KSeF fallback: response status={response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                invoice_list = data.get('invoiceHeaders', []) or data.get('invoiceHeaderList', []) or data.get('items', [])
                
                for inv in invoice_list:
                    invoice_data = self._parse_invoice_header(inv)
                    if invoice_data:
                        invoices.append(invoice_data)
                
                return invoices, f"Pobrano {len(invoices)} faktur (API 2.0)"
            elif response.status_code == 401:
                return [], "Błąd autoryzacji (401): Token wygasł lub jest nieprawidłowy."
            else:
                logger.error(f"KSeF fallback error: {response.status_code} - {response.text[:500]}")
                return [], f"Błąd zapytania (HTTP {response.status_code}): {response.text[:200]}"
                
        except Exception as e:
            logger.error(f"KSeF fallback exception: {e}", exc_info=True)
            return [], f"Błąd pobierania faktur: {str(e)}"
    
    def _parse_export_file(self, path) -> List[Dict]:
        """Parsuj plik eksportu z KSeF."""
        invoices = []
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            from pathlib import Path
            
            # Konwertuj na string jeśli to Path
            path_str = str(path)
            
            logger.info(f"Parsing export file: {path_str}")
            
            if path_str.endswith('.zip'):
                with zipfile.ZipFile(path_str, 'r') as zf:
                    xml_files = [n for n in zf.namelist() if n.endswith('.xml')]
                    logger.info(f"Found {len(xml_files)} XML files in ZIP: {xml_files}")
                    
                    for name in xml_files:
                        with zf.open(name) as f:
                            xml_content = f.read().decode('utf-8')
                            logger.debug(f"Parsing XML: {name}, length={len(xml_content)}")
                            inv = self._parse_invoice_xml(xml_content, name)
                            if inv:
                                invoices.append(inv)
                                logger.info(f"Parsed invoice: {inv.get('numer', 'unknown')}")
            else:
                logger.warning(f"File is not a ZIP: {path_str}")
        except Exception as e:
            logger.error(f"Błąd parsowania eksportu: {e}", exc_info=True)
        
        return invoices
    
    def _parse_invoice_xml(self, xml_content: str, filename: str = '') -> Optional[Dict]:
        """Parsuj XML faktury KSeF."""
        try:
            import xml.etree.ElementTree as ET
            import re
            
            root = ET.fromstring(xml_content)
            
            # Znajdź namespace używany w dokumencie
            ns_match = re.search(r'\{([^}]+)\}', root.tag)
            ns_uri = ns_match.group(1) if ns_match else ''
            ns = {'fa': ns_uri} if ns_uri else {}
            
            def find_text(paths, default=''):
                """Helper do szukania tekstu w różnych ścieżkach."""
                for path in paths:
                    try:
                        if ns:
                            result = root.findtext(path, default=None, namespaces=ns)
                        else:
                            result = root.findtext(path, default=None)
                        if result:
                            return result.strip()
                    except:
                        pass
                return default
            
            def find_all_text(paths):
                """Helper do szukania wszystkich wystąpień."""
                results = []
                for path in paths:
                    try:
                        if ns:
                            elements = root.findall(path, namespaces=ns)
                        else:
                            elements = root.findall(path)
                        for el in elements:
                            if el.text:
                                results.append(el.text.strip())
                    except:
                        pass
                return results
            
            # Wyciągnij numer KSeF z nazwy pliku
            ksef_numer = filename.replace('.xml', '') if filename else ''
            
            # Podstawowe dane faktury
            numer = find_text(['.//fa:P_2', './/P_2', './/{*}P_2'])
            data_wystawienia = find_text(['.//fa:P_1', './/P_1', './/{*}P_1'])
            data_sprzedazy = find_text(['.//fa:P_6', './/P_6', './/{*}P_6'])
            
            # Termin płatności - P_19A lub TerminPlatnosci
            termin_platnosci = find_text([
                './/fa:Platnosc//fa:TerminPlatnosci//fa:Termin',
                './/fa:TerminPlatnosci//fa:Termin',
                './/fa:P_19A',
                './/Platnosc//TerminPlatnosci//Termin',
                './/{*}Platnosc//{*}TerminPlatnosci//{*}Termin',
                './/{*}P_19A',
            ])
            
            # Kwoty - P_15 to suma brutto (należność ogółem)
            kwota_brutto_str = find_text(['.//fa:P_15', './/P_15', './/{*}P_15'], '0')
            
            # Jeśli nie ma P_15, spróbuj zsumować netto + VAT
            if not kwota_brutto_str or kwota_brutto_str == '0':
                # Zbierz wszystkie kwoty netto (P_13_1 do P_13_11)
                netto_values = []
                for i in range(1, 12):
                    val = find_text([f'.//fa:P_13_{i}', f'.//P_13_{i}', f'.//*P_13_{i}'], '0')
                    if val and val != '0':
                        netto_values.append(Decimal(val))
                
                # Zbierz wszystkie kwoty VAT (P_14_1 do P_14_5)
                vat_values = []
                for i in range(1, 6):
                    val = find_text([f'.//fa:P_14_{i}', f'.//P_14_{i}', f'.//*P_14_{i}'], '0')
                    if val and val != '0':
                        vat_values.append(Decimal(val))
                
                kwota_brutto = sum(netto_values, Decimal('0')) + sum(vat_values, Decimal('0'))
            else:
                kwota_brutto = Decimal(kwota_brutto_str.replace(',', '.').replace(' ', ''))
            
            # Sprzedawca (Podmiot1)
            sprzedawca_nazwa = find_text([
                './/fa:Podmiot1//fa:DaneIdentyfikacyjne//fa:Nazwa',
                './/fa:Podmiot1//fa:Nazwa',
                './/Podmiot1//DaneIdentyfikacyjne//Nazwa',
                './/{*}Podmiot1//{*}DaneIdentyfikacyjne//{*}Nazwa',
                './/{*}Podmiot1//{*}Nazwa',
            ])
            sprzedawca_nip = find_text([
                './/fa:Podmiot1//fa:DaneIdentyfikacyjne//fa:NIP',
                './/fa:Podmiot1//fa:NIP',
                './/{*}Podmiot1//{*}NIP',
            ])
            sprzedawca_adres = find_text([
                './/fa:Podmiot1//fa:Adres//fa:AdresL1',
                './/{*}Podmiot1//{*}Adres//{*}AdresL1',
            ])
            sprzedawca_miasto = find_text([
                './/fa:Podmiot1//fa:Adres//fa:AdresL2',
                './/{*}Podmiot1//{*}Adres//{*}AdresL2',
            ])
            
            # Nabywca (Podmiot2)
            nabywca_nazwa = find_text([
                './/fa:Podmiot2//fa:DaneIdentyfikacyjne//fa:Nazwa',
                './/fa:Podmiot2//fa:Nazwa',
                './/{*}Podmiot2//{*}DaneIdentyfikacyjne//{*}Nazwa',
            ])
            nabywca_nip = find_text([
                './/fa:Podmiot2//fa:DaneIdentyfikacyjne//fa:NIP',
                './/fa:Podmiot2//fa:NIP',
                './/{*}Podmiot2//{*}NIP',
            ])
            
            # Pozycje faktury - FaWiersz
            pozycje = []
            wiersz_paths = ['.//fa:FaWiersz', './/FaWiersz', './/{*}FaWiersz']
            for path in wiersz_paths:
                try:
                    if ns:
                        wiersze = root.findall(path, namespaces=ns)
                    else:
                        wiersze = root.findall(path)
                    
                    if wiersze:
                        for wiersz in wiersze:
                            poz = {}
                            # Nazwa towaru/usługi
                            for name_path in ['fa:P_7', 'P_7', '{*}P_7']:
                                el = wiersz.find(name_path, namespaces=ns) if ns else wiersz.find(name_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['nazwa'] = el.text.strip()
                                    break
                            
                            # Ilość
                            for qty_path in ['fa:P_8B', 'P_8B']:
                                el = wiersz.find(qty_path, namespaces=ns) if ns else wiersz.find(qty_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['ilosc'] = el.text.strip()
                                    break
                            
                            # Jednostka
                            for unit_path in ['fa:P_8A', 'P_8A']:
                                el = wiersz.find(unit_path, namespaces=ns) if ns else wiersz.find(unit_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['jednostka'] = el.text.strip()
                                    break
                            
                            # Cena jednostkowa netto
                            for price_path in ['fa:P_9A', 'P_9A']:
                                el = wiersz.find(price_path, namespaces=ns) if ns else wiersz.find(price_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['cena_netto'] = el.text.strip()
                                    break
                            
                            # Wartość netto
                            for val_path in ['fa:P_11', 'P_11']:
                                el = wiersz.find(val_path, namespaces=ns) if ns else wiersz.find(val_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['wartosc_netto'] = el.text.strip()
                                    break
                            
                            # Stawka VAT
                            for vat_path in ['fa:P_12', 'P_12']:
                                el = wiersz.find(vat_path, namespaces=ns) if ns else wiersz.find(vat_path.replace('fa:', ''))
                                if el is not None and el.text:
                                    poz['stawka_vat'] = el.text.strip()
                                    break
                            
                            if poz.get('nazwa'):
                                pozycje.append(poz)
                        break
                except Exception as e:
                    logger.debug(f"Error parsing positions: {e}")
                    continue
            
            # Waluta
            waluta = find_text(['.//fa:KodWaluty', './/KodWaluty', './/{*}KodWaluty'], 'PLN')
            
            # Forma płatności
            forma_platnosci = find_text([
                './/fa:Platnosc//fa:FormaPlatnosci',
                './/{*}Platnosc//{*}FormaPlatnosci',
            ])
            
            logger.info(f"Parsed XML {filename}: numer={numer}, data={data_wystawienia}, "
                       f"kwota={kwota_brutto}, termin={termin_platnosci}, pozycji={len(pozycje)}")
            
            if not numer and not sprzedawca_nazwa:
                logger.warning(f"Could not parse invoice from {filename}")
                logger.debug(f"XML content (first 1000 chars): {xml_content[:1000]}")
                return None
            
            return {
                'ksef_numer': ksef_numer,
                'numer': numer,
                'data': data_wystawienia[:10] if data_wystawienia else '',
                'data_sprzedazy': data_sprzedazy[:10] if data_sprzedazy else '',
                'termin_platnosci': termin_platnosci[:10] if termin_platnosci else '',
                'kwota': float(kwota_brutto),
                'waluta': waluta,
                'dostawca': sprzedawca_nazwa,
                'dostawca_nip': sprzedawca_nip,
                'dostawca_adres': f"{sprzedawca_adres}, {sprzedawca_miasto}".strip(', '),
                'nabywca': nabywca_nazwa,
                'nabywca_nip': nabywca_nip,
                'forma_platnosci': forma_platnosci,
                'pozycje': pozycje,
            }
        except Exception as e:
            logger.error(f"Błąd parsowania XML {filename}: {e}", exc_info=True)
            return None
    
    def _parse_invoice_header(self, header: Dict) -> Optional[Dict]:
        """Parsuj nagłówek faktury z API."""
        try:
            ksef_ref = header.get('ksefReferenceNumber') or header.get('referenceNumber', '')
            invoice_ref = header.get('invoiceReferenceNumber') or header.get('invoiceNumber', '')
            issue_date = header.get('invoicingDate') or header.get('issueDate', '')
            
            net = Decimal(str(header.get('net', 0) or header.get('netAmount', 0)))
            vat = Decimal(str(header.get('vat', 0) or header.get('vatAmount', 0)))
            
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
    
    def terminate_session(self):
        """Zakończ sesję KSeF."""
        if KSEF2_AVAILABLE and self._auth:
            try:
                self._auth.sessions.terminate_current()
            except Exception:
                pass
        elif self.access_token:
            try:
                requests.delete(
                    f"{self.base_url}/auth/sessions/current",
                    headers={'Authorization': f'Bearer {self.access_token}'},
                    timeout=10
                )
            except Exception:
                pass
        
        self.access_token = None
        self._auth = None
        self._client = None


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
        # Autoryzuj
        success, auth_msg = service.authorize()
        if not success:
            return [], auth_msg
        
        # Pobierz faktury
        invoices, fetch_msg = service.fetch_invoices(date_from, date_to)
        return invoices, fetch_msg
    except Exception as e:
        return [], f"Błąd: {str(e)}"
    finally:
        service.terminate_session()
