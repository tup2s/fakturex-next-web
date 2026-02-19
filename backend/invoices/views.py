from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Case, When, BooleanField
from datetime import date, timedelta
import json
from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    API ViewSet dla faktur kosztowych.
    """
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    def get_queryset(self):
        queryset = Invoice.objects.all()
        
        # Filtrowanie po statusie
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filtrowanie przeterminowanych
        overdue = self.request.query_params.get('overdue')
        if overdue == 'true':
            queryset = queryset.filter(
                status='niezaplacona',
                termin_platnosci__lt=date.today()
            )
        
        # Filtrowanie po dostawcy
        dostawca = self.request.query_params.get('dostawca')
        if dostawca:
            queryset = queryset.filter(dostawca__icontains=dostawca)
        
        # Filtrowanie po roku
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(data__year=int(year))
        
        # Filtrowanie po miesiącu
        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(data__month=int(month))
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def available_years(self, request):
        """
        Zwraca listę lat, dla których istnieją faktury.
        """
        years = Invoice.objects.dates('data', 'year', order='DESC')
        year_list = [d.year for d in years]
        
        # Dodaj bieżący rok jeśli nie ma
        current_year = date.today().year
        if current_year not in year_list:
            year_list.insert(0, current_year)
        
        return Response({'years': year_list})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statystyki faktur dla dashboardu.
        Opcjonalny parametr current_month=true dla statystyk tylko z bieżącego miesiąca.
        """
        today = date.today()
        current_month_only = request.query_params.get('current_month') == 'true'
        
        # Wszystkie faktury (lub tylko z bieżącego miesiąca)
        all_invoices = Invoice.objects.all()
        if current_month_only:
            all_invoices = all_invoices.filter(
                data__year=today.year,
                data__month=today.month
            )
        
        # Statystyki
        total_count = all_invoices.count()
        zaplacone = all_invoices.filter(status='zaplacona')
        niezaplacone = all_invoices.filter(status='niezaplacona')
        przeterminowane = niezaplacone.filter(termin_platnosci__lt=today)
        blisko_terminu = niezaplacone.filter(
            termin_platnosci__gte=today,
            termin_platnosci__lte=today + timedelta(days=3)
        )
        
        # Sumy
        suma_wszystkich = all_invoices.aggregate(total=Sum('kwota'))['total'] or 0
        suma_zaplaconych = zaplacone.aggregate(total=Sum('kwota'))['total'] or 0
        suma_niezaplaconych = niezaplacone.aggregate(total=Sum('kwota'))['total'] or 0
        suma_przeterminowanych = przeterminowane.aggregate(total=Sum('kwota'))['total'] or 0
        
        return Response({
            'total_count': total_count,
            'zaplacone_count': zaplacone.count(),
            'niezaplacone_count': niezaplacone.count(),
            'przeterminowane_count': przeterminowane.count(),
            'blisko_terminu_count': blisko_terminu.count(),
            'suma_wszystkich': float(suma_wszystkich),
            'suma_zaplaconych': float(suma_zaplaconych),
            'suma_niezaplaconych': float(suma_niezaplaconych),
            'suma_przeterminowanych': float(suma_przeterminowanych),
            'current_month': current_month_only,
            'month_name': today.strftime('%B %Y') if current_month_only else None,
        })
    
    @action(detail=False, methods=['get'])
    def recent_unpaid(self, request):
        """
        Ostatnie niezapłacone faktury dla dashboardu.
        Domyślnie zwraca 5 faktur, można zmienić parametrem limit.
        Sortowane: przeterminowane najpierw, potem po terminie płatności.
        """
        limit = int(request.query_params.get('limit', 5))
        today = date.today()
        
        # Niezapłacone faktury
        invoices = Invoice.objects.filter(status='niezaplacona').annotate(
            is_overdue_db=Case(
                When(termin_platnosci__lt=today, then=True),
                default=False,
                output_field=BooleanField()
            )
        ).order_by('-is_overdue_db', 'termin_platnosci')[:limit]
        
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """
        Oznacz fakturę jako zapłaconą.
        """
        invoice = self.get_object()
        invoice.status = 'zaplacona'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)
    
    @action(detail=True, methods=['post'])
    def mark_unpaid(self, request, pk=None):
        """
        Oznacz fakturę jako niezapłaconą.
        """
        invoice = self.get_object()
        invoice.status = 'niezaplacona'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)
    
    @action(detail=True, methods=['get'])
    def ksef_data(self, request, pk=None):
        """
        Pobierz pełne dane KSeF dla faktury (pozycje, nabywca, sprzedawca itp.)
        """
        invoice = self.get_object()
        
        if not invoice.ksef_numer:
            return Response(
                {'error': 'Ta faktura nie pochodzi z KSeF.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Spróbuj sparsować zapisane dane KSeF
        ksef_data = {}
        if invoice.ksef_xml:
            try:
                ksef_data = json.loads(invoice.ksef_xml)
            except json.JSONDecodeError:
                # Stary format XML - brak danych szczegółowych
                pass
        
        return Response({
            'invoice_id': invoice.id,
            'ksef_numer': invoice.ksef_numer,
            'numer': invoice.numer,
            'data': str(invoice.data),
            'kwota': float(invoice.kwota),
            'dostawca': invoice.dostawca,
            'termin_platnosci': str(invoice.termin_platnosci),
            'data_sprzedazy': ksef_data.get('data_sprzedazy'),
            'dostawca_nip': ksef_data.get('dostawca_nip'),
            'dostawca_adres': ksef_data.get('dostawca_adres'),
            'nabywca': ksef_data.get('nabywca'),
            'nabywca_nip': ksef_data.get('nabywca_nip'),
            'forma_platnosci': ksef_data.get('forma_platnosci'),
            'waluta': ksef_data.get('waluta', 'PLN'),
            'pozycje': ksef_data.get('pozycje', []),
        })
    
    @action(detail=True, methods=['post'])
    def refresh_ksef_data(self, request, pk=None):
        """
        Odśwież dane KSeF dla faktury - pobierz ponownie z KSeF bez zmiany statusu płatności.
        """
        from customers.models import Settings
        from customers.encryption import decrypt_token
        from .ksef_service import KSeFService, KSEF2_AVAILABLE
        
        invoice = self.get_object()
        
        if not invoice.ksef_numer:
            return Response(
                {'error': 'Ta faktura nie pochodzi z KSeF.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Sprawdź konfigurację KSeF
        settings = Settings.objects.first()
        if not settings or not settings.ksef_token or not settings.firma_nip:
            return Response(
                {'error': 'Brak konfiguracji KSeF. Uzupełnij token i NIP w ustawieniach.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not KSEF2_AVAILABLE:
            return Response(
                {'error': 'Biblioteka ksef2 nie jest dostępna.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            # Przygotuj zakres dat - dzień przed i po dacie faktury
            date_from = (invoice.data - timedelta(days=1)).strftime('%Y-%m-%d')
            date_to = (invoice.data + timedelta(days=1)).strftime('%Y-%m-%d')
            
            token = decrypt_token(settings.ksef_token)
            service = KSeFService(token, settings.firma_nip, settings.ksef_environment)
            
            success, auth_msg = service.authorize()
            if not success:
                return Response(
                    {'error': f'Błąd autoryzacji KSeF: {auth_msg}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            try:
                invoices_data, msg = service.fetch_invoices(date_from, date_to, 'SUBJECT2')
                
                # Znajdź fakturę po ksef_numer
                found = None
                for inv in invoices_data:
                    if inv.get('ksef_numer') == invoice.ksef_numer:
                        found = inv
                        break
                
                if not found:
                    return Response(
                        {'error': f'Nie znaleziono faktury {invoice.ksef_numer} w KSeF. Spróbuj rozszerzyć zakres dat.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Zaktualizuj tylko dane KSeF (bez zmiany statusu)
                ksef_data = {
                    'data_sprzedazy': found.get('data_sprzedazy'),
                    'dostawca_nip': found.get('dostawca_nip'),
                    'dostawca_adres': found.get('dostawca_adres'),
                    'nabywca': found.get('nabywca'),
                    'nabywca_nip': found.get('nabywca_nip'),
                    'forma_platnosci': found.get('forma_platnosci'),
                    'waluta': found.get('waluta'),
                    'pozycje': found.get('pozycje', []),
                }
                
                invoice.ksef_xml = json.dumps(ksef_data, ensure_ascii=False)
                invoice.save(update_fields=['ksef_xml'])
                
                return Response({
                    'success': True,
                    'message': 'Dane KSeF zostały zaktualizowane.',
                    'pozycje_count': len(ksef_data.get('pozycje', [])),
                    'nabywca': ksef_data.get('nabywca'),
                })
                
            finally:
                service.terminate_session()
                
        except Exception as e:
            return Response(
                {'error': f'Błąd pobierania danych: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def ksef_diagnostics(self, request):
        """
        Diagnostyka połączenia z KSeF - sprawdź konfigurację i autoryzację.
        """
        from customers.models import Settings
        from customers.encryption import decrypt_token, is_token_encrypted
        from .ksef_service import KSeFService, KSEF2_AVAILABLE, get_environment
        from django.conf import settings as django_settings
        import os
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            settings = Settings.objects.first()
            
            # Wyczyść NIP 
            raw_nip = settings.firma_nip if settings else None
            clean_nip = raw_nip.replace('-', '').replace(' ', '').strip() if raw_nip else None
            
            diag = {
                'ksef2_available': KSEF2_AVAILABLE,
                'settings_exists': settings is not None,
                'has_token': bool(settings and settings.ksef_token),
                'has_nip': bool(settings and settings.firma_nip),
                'environment': settings.ksef_environment if settings else None,
                'nip_raw': raw_nip,
                'nip_clean': clean_nip,
                'nip_length': len(clean_nip) if clean_nip else 0,
                'token_length': len(settings.ksef_token) if settings and settings.ksef_token else 0,
                'encryption_key_set': bool(getattr(django_settings, 'ENCRYPTION_KEY', None) or os.environ.get('ENCRYPTION_KEY')),
            }
            
            if settings and settings.ksef_token and settings.firma_nip:
                encrypted_token = settings.ksef_token
                diag['token_is_encrypted'] = is_token_encrypted(encrypted_token)
                diag['encrypted_token_starts'] = encrypted_token[:30] + '...' if len(encrypted_token) > 30 else encrypted_token
                
                token = decrypt_token(encrypted_token)
                clean_token = token.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                diag['decrypted_token_length'] = len(token)
                diag['clean_token_length'] = len(clean_token)
                diag['decryption_worked'] = token != encrypted_token
                diag['token_starts_with'] = clean_token[:30] + '...' if len(clean_token) > 30 else clean_token
                diag['token_has_whitespace'] = token != clean_token
                
                # Spróbuj autoryzacji
                service = KSeFService(token, settings.firma_nip, settings.ksef_environment)
                diag['base_url'] = service.base_url
                
                success, auth_msg = service.authorize()
                diag['auth_success'] = success
                diag['auth_message'] = auth_msg
                
                service.terminate_session()
            
            return Response(diag)
            
        except Exception as e:
            import traceback
            return Response({
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=500)

    @action(detail=False, methods=['post'])
    def ksef_test_fetch(self, request):
        """
        Test pobierania faktur z KSeF z pełnym logowaniem.
        """
        from customers.models import Settings
        from customers.encryption import decrypt_token
        from .ksef_service import KSeFService, KSEF2_AVAILABLE
        from datetime import datetime, timedelta
        import logging
        import io
        import sys
        
        # Capture logs
        log_capture = io.StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(logging.Formatter('%(levelname)s|%(name)s|%(message)s'))
        
        # Add handler to ksef logger
        ksef_logger = logging.getLogger('invoices.ksef_service')
        ksef_logger.addHandler(handler)
        ksef_logger.setLevel(logging.DEBUG)
        
        result = {
            'ksef2_available': KSEF2_AVAILABLE,
            'steps': [],
            'logs': '',
            'invoices': [],
            'error': None
        }
        
        try:
            result['steps'].append('1. Loading settings')
            settings = Settings.objects.first()
            
            if not settings or not settings.ksef_token:
                result['error'] = 'No KSeF token configured'
                return Response(result)
            
            result['steps'].append('2. Decrypting token')
            token = decrypt_token(settings.ksef_token)
            
            date_from = request.data.get('date_from', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            date_to = request.data.get('date_to', datetime.now().strftime('%Y-%m-%d'))
            result['date_range'] = f'{date_from} to {date_to}'
            
            result['steps'].append('3. Creating KSeFService')
            service = KSeFService(token, settings.firma_nip, settings.ksef_environment)
            result['environment'] = settings.ksef_environment
            result['base_url'] = service.base_url
            
            result['steps'].append('4. Authorizing')
            success, auth_msg = service.authorize()
            result['auth_success'] = success
            result['auth_message'] = auth_msg
            
            if not success:
                result['error'] = f'Auth failed: {auth_msg}'
                return Response(result)
            
            result['steps'].append('5. Fetching invoices')
            invoices, fetch_msg = service.fetch_invoices(date_from, date_to)
            result['fetch_message'] = fetch_msg
            result['invoice_count'] = len(invoices)
            result['invoices'] = invoices[:5]  # First 5 only
            
            result['steps'].append('6. Terminating session')
            service.terminate_session()
            
            result['steps'].append('7. Done')
            
        except Exception as e:
            import traceback
            result['error'] = str(e)
            result['traceback'] = traceback.format_exc()
        finally:
            # Get captured logs
            ksef_logger.removeHandler(handler)
            result['logs'] = log_capture.getvalue()
        
        return Response(result)

    @action(detail=False, methods=['post'])
    def fetch_from_ksef(self, request):
        """
        Pobierz faktury z KSeF - zwraca podgląd do wyboru, nie zapisuje.
        Wymaga skonfigurowanego tokenu KSeF w ustawieniach.
        """
        from customers.models import Settings
        from customers.encryption import decrypt_token
        from .ksef_service import fetch_invoices_from_ksef
        from datetime import datetime, timedelta
        
        try:
            settings = Settings.objects.first()
            if not settings or not settings.ksef_token:
                return Response(
                    {'error': 'Brak skonfigurowanego tokenu KSeF. Przejdź do Ustawień i dodaj token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not settings.firma_nip:
                return Response(
                    {'error': 'Brak NIP firmy w ustawieniach. Przejdź do Ustawień i dodaj NIP.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Odszyfruj token
            token = decrypt_token(settings.ksef_token)
            
            # Zakres dat
            date_from = request.data.get('date_from', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            date_to = request.data.get('date_to', datetime.now().strftime('%Y-%m-%d'))
            
            # Pobierz faktury z KSeF
            invoices_data, message = fetch_invoices_from_ksef(
                token=token,
                nip=settings.firma_nip,
                environment=settings.ksef_environment,
                date_from=date_from,
                date_to=date_to
            )
            
            # Sprawdź które faktury już istnieją w bazie
            for inv_data in invoices_data:
                inv_data['already_exists'] = Invoice.objects.filter(ksef_numer=inv_data['ksef_numer']).exists()
            
            return Response({
                'message': message,
                'settings_configured': True,
                'environment': settings.ksef_environment,
                'nip': settings.firma_nip,
                'date_from': date_from,
                'date_to': date_to,
                'invoices': invoices_data,
                'total_found': len(invoices_data)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Błąd podczas pobierania z KSeF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def import_ksef_invoices(self, request):
        """
        Importuj wybrane faktury z KSeF do bazy danych.
        """
        invoices_data = request.data.get('invoices', [])
        
        if not invoices_data:
            return Response(
                {'error': 'Nie wybrano żadnych faktur do importu.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        imported_count = 0
        skipped_count = 0
        today = date.today()
        
        for inv_data in invoices_data:
            # Sprawdź czy faktura już istnieje
            if Invoice.objects.filter(ksef_numer=inv_data['ksef_numer']).exists():
                skipped_count += 1
                continue
            
            # Określ termin płatności
            termin_str = inv_data.get('termin_platnosci', inv_data['data'])
            if isinstance(termin_str, str):
                try:
                    termin = date.fromisoformat(termin_str)
                except ValueError:
                    termin = date.fromisoformat(inv_data['data'])
            else:
                termin = termin_str if termin_str else date.fromisoformat(inv_data['data'])
            
            # Określ status - zapłacone jeśli:
            # - termin płatności to dziś lub jutro (<=1 dzień)
            # - forma płatności to gotówka
            forma_platnosci = inv_data.get('forma_platnosci', '').lower()
            days_until_due = (termin - today).days
            
            if days_until_due <= 1 or 'gotówka' in forma_platnosci or 'gotowka' in forma_platnosci:
                invoice_status = 'zaplacona'
            else:
                invoice_status = 'niezaplacona'
            
            # Utwórz fakturę z pełnymi danymi KSeF
            ksef_data = {
                'data_sprzedazy': inv_data.get('data_sprzedazy'),
                'dostawca_nip': inv_data.get('dostawca_nip'),
                'dostawca_adres': inv_data.get('dostawca_adres'),
                'nabywca': inv_data.get('nabywca'),
                'nabywca_nip': inv_data.get('nabywca_nip'),
                'forma_platnosci': inv_data.get('forma_platnosci'),
                'waluta': inv_data.get('waluta'),
                'pozycje': inv_data.get('pozycje', []),
            }
            
            Invoice.objects.create(
                numer=inv_data['numer'],
                data=inv_data['data'],
                kwota=inv_data['kwota'],
                dostawca=inv_data['dostawca'],
                termin_platnosci=termin,
                status=invoice_status,
                ksef_numer=inv_data['ksef_numer'],
                ksef_xml=json.dumps(ksef_data, ensure_ascii=False),  # Zapisz dane KSeF jako JSON
            )
            imported_count += 1
        
        return Response({
            'message': f'Zaimportowano {imported_count} faktur.',
            'imported_count': imported_count,
            'skipped_count': skipped_count
        })