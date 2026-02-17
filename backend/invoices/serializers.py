from rest_framework import serializers
from .models import Invoice

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'  # or specify the fields you want to include, e.g., ['id', 'customer', 'amount', 'date']