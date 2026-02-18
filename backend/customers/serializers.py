from rest_framework import serializers
from .models import Contractor, Settings
from .encryption import encrypt_token, decrypt_token, is_token_encrypted


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
    Token KSeF jest szyfrowany przy zapisie i maskowany przy odczycie.
    """
    ksef_token_masked = serializers.SerializerMethodField()
    has_ksef_token = serializers.SerializerMethodField()
    
    class Meta:
        model = Settings
        fields = [
            'id', 'firma_nazwa', 'firma_nip', 'ksef_token', 'ksef_token_masked',
            'has_ksef_token', 'ksef_environment', 'auto_fetch_ksef', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'ksef_token_masked', 'has_ksef_token']
        extra_kwargs = {
            'ksef_token': {'write_only': True}
        }
    
    def get_ksef_token_masked(self, obj):
        """Zwróć zamaskowany token dla wyświetlania."""
        if obj.ksef_token:
            return '••••••••••••••••'
        return ''
    
    def get_has_ksef_token(self, obj):
        """Czy token jest skonfigurowany."""
        return bool(obj.ksef_token)
    
    def update(self, instance, validated_data):
        """Zaszyfruj token przed zapisem."""
        if 'ksef_token' in validated_data:
            token = validated_data['ksef_token']
            if token and not is_token_encrypted(token):
                validated_data['ksef_token'] = encrypt_token(token)
        return super().update(instance, validated_data)
    
    def create(self, validated_data):
        """Zaszyfruj token przed zapisem."""
        if 'ksef_token' in validated_data:
            token = validated_data['ksef_token']
            if token and not is_token_encrypted(token):
                validated_data['ksef_token'] = encrypt_token(token)
        return super().create(validated_data)