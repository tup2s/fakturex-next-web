from django.db import models
from customers.models import Customer
from products.models import Product


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Szkic'),
        ('issued', 'Wystawiona'),
        ('paid', 'Zapłacona'),
        ('overdue', 'Przeterminowana'),
        ('cancelled', 'Anulowana'),
    ]
    
    invoice_number = models.CharField(max_length=50, unique=True, verbose_name='Numer faktury')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices', verbose_name='Klient')
    issue_date = models.DateField(verbose_name='Data wystawienia')
    due_date = models.DateField(verbose_name='Termin płatności')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='Status')
    notes = models.TextField(blank=True, verbose_name='Uwagi')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Faktura'
        verbose_name_plural = 'Faktury'
        ordering = ['-issue_date', '-id']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer}"

    @property
    def subtotal(self):
        return sum(item.total for item in self.items.all())

    @property
    def tax_amount(self):
        return sum(item.tax_amount for item in self.items.all())

    @property
    def total(self):
        return self.subtotal + self.tax_amount


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    description = models.CharField(max_length=255, verbose_name='Opis')
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Ilość')
    unit = models.CharField(max_length=20, default='szt.', verbose_name='Jednostka')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Cena jednostkowa')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=23.00, verbose_name='Stawka VAT %')

    class Meta:
        verbose_name = 'Pozycja faktury'
        verbose_name_plural = 'Pozycje faktury'

    def __str__(self):
        return f"{self.description} x {self.quantity}"

    @property
    def total(self):
        return self.quantity * self.unit_price

    @property
    def tax_amount(self):
        return self.total * (self.tax_rate / 100)