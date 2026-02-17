from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'unit_price', 'tax_rate', 'unit', 'is_active']
    list_filter = ['tax_rate', 'unit', 'is_active']
    search_fields = ['name', 'code', 'description']
    list_editable = ['is_active']