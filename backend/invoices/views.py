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