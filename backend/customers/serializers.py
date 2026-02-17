from rest_framework import serializers
from .models import Contractor, Settings


class ContractorSerializer(serializers.ModelSerializer):
    """
    Serializer kontrahenta/dostawcy.
    """
    pelny_adres = serializers.CharField(read_only=True)
    
    class Meta:
        model = Contractor
        fields = [
            'id', 'nazwa', 'nip', 'ulica', 'miasto', 'kod_pocztowy', 'kraj',
            'email', 'telefon', 'notatki', 'pelny_adres', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SettingsSerializer(serializers.ModelSerializer):
    """
    Serializer ustawień firmy.
    """
    class Meta:
        model = Settings
        fields = [
            'id', 'firma_nazwa', 'firma_nip', 'ksef_token', 'ksef_environment',
            'auto_fetch_ksef', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']