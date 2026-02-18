from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
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
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statystyki faktur dla dashboardu.
        """
        today = date.today()
        
        # Wszystkie faktury
        all_invoices = Invoice.objects.all()
        
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
        })
    
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
    
    @action(detail=False, methods=['post'])
    def fetch_from_ksef(self, request):
        """
        Pobierz faktury z KSeF.
        Wymaga skonfigurowanego tokenu KSeF w ustawieniach.
        """
        from customers.models import CompanySettings
        import requests
        from datetime import datetime, timedelta
        
        try:
            settings = CompanySettings.objects.first()
            if not settings or not settings.ksef_token:
                return Response(
                    {'error': 'Brak skonfigurowanego tokenu KSeF. Przejdź do Ustawień i dodaj token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Środowisko KSeF
            ksef_urls = {
                'production': 'https://ksef.mf.gov.pl/api',
                'test': 'https://ksef-test.mf.gov.pl/api',
                'demo': 'https://ksef-demo.mf.gov.pl/api'
            }
            base_url = ksef_urls.get(settings.ksef_environment, ksef_urls['test'])
            
            # Zakres dat - ostatnie 30 dni
            date_from = request.data.get('date_from', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            date_to = request.data.get('date_to', datetime.now().strftime('%Y-%m-%d'))
            
            # W rzeczywistej implementacji tutaj byłaby pełna integracja z API KSeF
            # Na razie zwracamy komunikat informacyjny
            
            # TODO: Pełna implementacja API KSeF
            # 1. Autoryzacja tokenem
            # 2. Pobranie listy faktur za okres
            # 3. Parsowanie XML faktur
            # 4. Import do bazy danych
            
            return Response({
                'message': f'Funkcja pobierania z KSeF ({settings.ksef_environment}). Zakres: {date_from} - {date_to}',
                'info': 'Pełna integracja z API KSeF wymaga dodatkowej konfiguracji i certyfikatów.',
                'settings_configured': True,
                'environment': settings.ksef_environment,
                'nip': settings.firma_nip,
                'imported_count': 0
            })
            
        except Exception as e:
            return Response(
                {'error': f'Błąd podczas pobierania z KSeF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )