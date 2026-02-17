from rest_framework import serializers
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer faktury kosztowej.
    """
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    kontrahent_nazwa = serializers.CharField(source='kontrahent.nazwa', read_only=True, allow_null=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'numer', 'data', 'kwota', 'dostawca', 'termin_platnosci', 
            'status', 'kontrahent', 'kontrahent_nazwa', 'ksef_numer', 'notatki',
            'is_overdue', 'days_until_due', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']