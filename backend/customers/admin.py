from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'customer_type', 'nip', 'email', 'phone', 'city']
    list_filter = ['customer_type', 'city']
    search_fields = ['company_name', 'first_name', 'last_name', 'nip', 'email']
    
    fieldsets = (
        ('Typ klienta', {
            'fields': ('customer_type',)
        }),
        ('Dane firmy', {
            'fields': ('company_name', 'nip'),
            'classes': ('collapse',)
        }),
        ('Dane osobowe', {
            'fields': ('first_name', 'last_name')
        }),
        ('Kontakt', {
            'fields': ('email', 'phone')
        }),
        ('Adres', {
            'fields': ('street', 'postal_code', 'city', 'country')
        }),
        ('Notatki', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )