import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakturex.settings')
django.setup()

from django.contrib.auth import get_user_model
from customers.models import Settings

User = get_user_model()

# Pokaż istniejących użytkowników
print("=== Existing users ===")
for u in User.objects.all():
    print(f"  - {u.username} (id={u.id}, is_superuser={u.is_superuser})")

# Utwórz lub zaktualizuj użytkownika krzysztof
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'krzysztof')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'krzysztof@fakturex.pl')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'magia2')

user, created = User.objects.get_or_create(username=username, defaults={
    'email': email,
    'is_staff': True,
    'is_superuser': True,
})

if created:
    user.set_password(password)
    user.save()
    print(f'Superuser {username} created with password')
else:
    # Zawsze resetuj hasło do domyślnego
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f'Superuser {username} already exists - password reset to default')

# Pokaż użytkowników po zmianach
print("=== Users after setup ===")
for u in User.objects.all():
    print(f"  - {u.username} (id={u.id}, is_superuser={u.is_superuser})")

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
