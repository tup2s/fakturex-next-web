from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    full_address = serializers.CharField(read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'customer_type', 'company_name', 'first_name', 'last_name', 'nip',
                  'email', 'phone', 'street', 'city', 'postal_code', 'country', 'notes',
                  'display_name', 'full_address', 'created_at', 'updated_at']