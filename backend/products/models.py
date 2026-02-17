from django.db import models


class Product(models.Model):
    UNIT_CHOICES = [
        ('szt.', 'Sztuka'),
        ('kg', 'Kilogram'),
        ('m', 'Metr'),
        ('m2', 'Metr kwadratowy'),
        ('m3', 'Metr sześcienny'),
        ('l', 'Litr'),
        ('godz.', 'Godzina'),
        ('usł.', 'Usługa'),
    ]
    
    TAX_RATE_CHOICES = [
        (23, '23%'),
        (8, '8%'),
        (5, '5%'),
        (0, '0%'),
        (-1, 'zw.'),
    ]
    
    code = models.CharField(max_length=50, blank=True, verbose_name='Kod produktu')
    name = models.CharField(max_length=255, verbose_name='Nazwa')
    description = models.TextField(blank=True, verbose_name='Opis')
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='szt.', verbose_name='Jednostka')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Cena netto')
    tax_rate = models.IntegerField(choices=TAX_RATE_CHOICES, default=23, verbose_name='Stawka VAT')
    is_active = models.BooleanField(default=True, verbose_name='Aktywny')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Produkt/Usługa'
        verbose_name_plural = 'Produkty/Usługi'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def price_gross(self):
        if self.tax_rate == -1:
            return self.unit_price
        return self.unit_price * (1 + self.tax_rate / 100)