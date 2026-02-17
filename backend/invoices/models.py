from django.db import models
from decimal import Decimal
from datetime import date


class Invoice(models.Model):
    """
    Model faktury kosztowej (od dostawcy).
    Zgodny z oryginalną aplikacją Fakturex Next.
    """
    STATUS_CHOICES = [
        ('niezaplacona', 'Niezapłacona'),
        ('zaplacona', 'Zapłacona'),
    ]
    
    numer = models.CharField(max_length=100, verbose_name='Numer faktury')
    data = models.DateField(verbose_name='Data faktury')
    kwota = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Kwota brutto')
    dostawca = models.CharField(max_length=255, verbose_name='Dostawca')
    termin_platnosci = models.DateField(verbose_name='Termin płatności')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='niezaplacona', verbose_name='Status')
    
    # Opcjonalne powiązanie z kontrahentem
    kontrahent = models.ForeignKey(
        'customers.Contractor', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='faktury',
        verbose_name='Kontrahent'
    )
    
    # KSeF
    ksef_numer = models.CharField(max_length=100, blank=True, verbose_name='Numer KSeF')
    ksef_xml = models.TextField(blank=True, verbose_name='XML KSeF')
    
    notatki = models.TextField(blank=True, verbose_name='Notatki')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Faktura'
        verbose_name_plural = 'Faktury'
        ordering = ['-data', '-id']

    def __str__(self):
        return f"{self.numer} - {self.dostawca}"

    @property
    def is_overdue(self):
        """Czy faktura jest przeterminowana"""
        if self.status == 'zaplacona':
            return False
        return date.today() > self.termin_platnosci

    @property
    def days_until_due(self):
        """Dni do terminu płatności (ujemne = przeterminowana)"""
        return (self.termin_platnosci - date.today()).days