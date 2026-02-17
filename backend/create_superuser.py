import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakturex.settings')
django.setup()

from django.contrib.auth import get_user_model
from customers.models import Settings

User = get_user_model()

# Utwórz użytkownika krzysztof
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'krzysztof')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'krzysztof@fakturex.pl')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'magia2')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Superuser {username} created')
else:
    print(f'Superuser {username} already exists')

# Utwórz domyślne ustawienia jeśli nie istnieją
if not Settings.objects.exists():
    Settings.objects.create(
        firma_nazwa='Moja Firma',
        firma_nip='',
        ksef_token='',
        ksef_environment='test',
        auto_fetch_ksef=False
    )
    print('Default settings created')
else:
    print('Settings already exist')
