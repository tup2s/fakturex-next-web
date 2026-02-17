from django.contrib import admin
from .models import Contractor, Settings


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['nazwa', 'nip', 'miasto', 'email', 'telefon']
    list_filter = ['miasto', 'kraj']
    search_fields = ['nazwa', 'nip', 'email']
    ordering = ['nazwa']
    
    fieldsets = (
        ('Dane kontrahenta', {
            'fields': ('nazwa', 'nip')
        }),
        ('Adres', {
            'fields': ('ulica', 'kod_pocztowy', 'miasto', 'kraj')
        }),
        ('Kontakt', {
            'fields': ('email', 'telefon')
        }),
        ('Notatki', {
            'fields': ('notatki',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Settings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ['firma_nazwa', 'firma_nip', 'ksef_environment', 'auto_fetch_ksef']
    
    fieldsets = (
        ('Dane firmy', {
            'fields': ('firma_nazwa', 'firma_nip')
        }),
        ('KSeF', {
            'fields': ('ksef_token', 'ksef_environment', 'auto_fetch_ksef')
        }),
    )
    
    def has_add_permission(self, request):
        # Tylko jeden rekord ustawień
        return not Settings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False
        }),
    )