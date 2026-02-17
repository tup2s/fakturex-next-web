from django.db import models


class Customer(models.Model):
    CUSTOMER_TYPE_CHOICES = [
        ('individual', 'Osoba fizyczna'),
        ('company', 'Firma'),
    ]
    
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='company', verbose_name='Typ klienta')
    company_name = models.CharField(max_length=255, blank=True, verbose_name='Nazwa firmy')
    first_name = models.CharField(max_length=100, blank=True, verbose_name='Imię')
    last_name = models.CharField(max_length=100, blank=True, verbose_name='Nazwisko')
    nip = models.CharField(max_length=15, blank=True, verbose_name='NIP')
    email = models.EmailField(blank=True, verbose_name='Email')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefon')
    
    # Adres
    street = models.CharField(max_length=255, blank=True, verbose_name='Ulica')
    city = models.CharField(max_length=100, blank=True, verbose_name='Miasto')
    postal_code = models.CharField(max_length=10, blank=True, verbose_name='Kod pocztowy')
    country = models.CharField(max_length=100, default='Polska', verbose_name='Kraj')
    
    notes = models.TextField(blank=True, verbose_name='Notatki')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Klient'
        verbose_name_plural = 'Klienci'
        ordering = ['company_name', 'last_name']

    def __str__(self):
        if self.company_name:
            return self.company_name
        return f"{self.first_name} {self.last_name}"

    @property
    def display_name(self):
        if self.company_name:
            return self.company_name
        return f"{self.first_name} {self.last_name}"

    @property
    def full_address(self):
        parts = [self.street, f"{self.postal_code} {self.city}".strip(), self.country]
        return ", ".join(p for p in parts if p)