from django.db import models


class Contractor(models.Model):
    """
    Model kontrahenta/dostawcy.
    Zgodny z oryginalną aplikacją Fakturex Next.
    """
    nazwa = models.CharField(max_length=255, verbose_name='Nazwa')
    nip = models.CharField(max_length=15, blank=True, verbose_name='NIP')
    
    # Adres
    ulica = models.CharField(max_length=255, blank=True, verbose_name='Ulica')
    miasto = models.CharField(max_length=100, blank=True, verbose_name='Miasto')
    kod_pocztowy = models.CharField(max_length=10, blank=True, verbose_name='Kod pocztowy')
    kraj = models.CharField(max_length=100, default='Polska', verbose_name='Kraj')
    
    # Kontakt
    email = models.EmailField(blank=True, verbose_name='Email')
    telefon = models.CharField(max_length=20, blank=True, verbose_name='Telefon')
    
    notatki = models.TextField(blank=True, verbose_name='Notatki')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Kontrahent'
        verbose_name_plural = 'Kontrahenci'
        ordering = ['nazwa']

    def __str__(self):
        return self.nazwa

    @property
    def pelny_adres(self):
        parts = [self.ulica, f"{self.kod_pocztowy} {self.miasto}".strip(), self.kraj]
        return ", ".join(p for p in parts if p)


class Settings(models.Model):
    """
    Ustawienia firmy - NIP, token KSeF, środowisko.
    Singleton - tylko jeden rekord.
    """
    ENVIRONMENT_CHOICES = [
        ('production', 'Produkcja'),
        ('test', 'Test'),
        ('demo', 'Demo'),
    ]
    
    firma_nazwa = models.CharField(max_length=255, blank=True, verbose_name='Nazwa firmy')
    firma_nip = models.CharField(max_length=15, blank=True, verbose_name='NIP firmy')
    ksef_token = models.TextField(blank=True, verbose_name='Token KSeF')
    ksef_environment = models.CharField(
        max_length=20, 
        choices=ENVIRONMENT_CHOICES, 
        default='test', 
        verbose_name='Środowisko KSeF'
    )
    auto_fetch_ksef = models.BooleanField(default=False, verbose_name='Automatyczne pobieranie z KSeF')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ustawienia'
        verbose_name_plural = 'Ustawienia'

    def __str__(self):
        return f"Ustawienia - {self.firma_nip or 'Brak NIP'}"

    def save(self, *args, **kwargs):
        # Singleton - zawsze nadpisuj rekord o id=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Pobierz lub utwórz ustawienia"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj