from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['numer', 'dostawca', 'data', 'kwota', 'termin_platnosci', 'status', 'is_overdue']
    list_filter = ['status', 'data', 'termin_platnosci']
    search_fields = ['numer', 'dostawca', 'ksef_numer']
    date_hierarchy = 'data'
    list_editable = ['status']
    ordering = ['-data']
    
    fieldsets = (
        ('Dane faktury', {
            'fields': ('numer', 'dostawca', 'kontrahent', 'data', 'kwota')
        }),
        ('Płatność', {
            'fields': ('termin_platnosci', 'status')
        }),
        ('KSeF', {
            'fields': ('ksef_numer', 'ksef_xml'),
            'classes': ('collapse',)
        }),
        ('Notatki', {
            'fields': ('notatki',),
            'classes': ('collapse',)
        }),
    )
    
    def is_overdue(self, obj):
        return obj.is_overdue
    is_overdue.boolean = True
    is_overdue.short_description = 'Przeterminowana'