from django.contrib import admin
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    fields = ['description', 'quantity', 'unit', 'unit_price', 'tax_rate', 'product']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'issue_date', 'due_date', 'status', 'total']
    list_filter = ['status', 'issue_date']
    search_fields = ['invoice_number', 'customer__company_name', 'customer__last_name']
    date_hierarchy = 'issue_date'
    inlines = [InvoiceItemInline]
    
    fieldsets = (
        ('Podstawowe', {
            'fields': ('invoice_number', 'customer', 'status')
        }),
        ('Daty', {
            'fields': ('issue_date', 'due_date')
        }),
        ('Dodatkowe', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )