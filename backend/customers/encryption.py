"""
Szyfrowanie tokenów KSeF.
Używa Fernet (symetryczne szyfrowanie AES-128).
"""
import base64
import os
from cryptography.fernet import Fernet
from django.conf import settings


def get_encryption_key():
    """
    Pobierz klucz szyfrowania z ustawień Django.
    Jeśli nie istnieje, wygeneruj nowy.
    """
    key = getattr(settings, 'ENCRYPTION_KEY', None)
    if not key:
        key = os.environ.get('ENCRYPTION_KEY')
    
    if not key:
        # Fallback - użyj SECRET_KEY jako bazy (nie idealne, ale działa)
        secret = settings.SECRET_KEY.encode()
        # Fernet wymaga 32-bajtowego klucza zakodowanego w base64
        key = base64.urlsafe_b64encode(secret[:32].ljust(32, b'0'))
    elif isinstance(key, str):
        key = key.encode()
    
    return key


def encrypt_token(plain_token: str) -> str:
    """
    Zaszyfruj token KSeF.
    Zwraca zaszyfrowany string zakodowany w base64.
    """
    if not plain_token:
        return ''
    
    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(plain_token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Odszyfruj token KSeF.
    Zwraca oryginalny token.
    """
    if not encrypted_token:
        return ''
    
    try:
        key = get_encryption_key()
        f = Fernet(key)
        decrypted = f.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except Exception:
        # Token może być niezaszyfrowany (stary format)
        return encrypted_token


def is_token_encrypted(token: str) -> bool:
    """
    Sprawdź czy token jest zaszyfrowany (format Fernet).
    """
    if not token:
        return False
    
    try:
        # Fernet tokens zaczynają się od 'gAAAAA'
        return token.startswith('gAAAAA')
    except Exception:
        return False
