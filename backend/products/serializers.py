from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    price_gross = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_rate_display = serializers.CharField(source='get_tax_rate_display', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'code', 'name', 'description', 'unit', 'unit_price', 'tax_rate',
                  'tax_rate_display', 'price_gross', 'is_active', 'created_at', 'updated_at']