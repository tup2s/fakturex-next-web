import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakturex.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from customers.models import Settings

User = get_user_model()

print("=== Database info ===")
print(f"Database: {connection.settings_dict['ENGINE']}")
print(f"Name: {connection.settings_dict.get('NAME', 'N/A')}")

# Sprawdź czy tabela auth_user istnieje
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM auth_user")
        count = cursor.fetchone()[0]
        print(f"Users in auth_user table: {count}")
except Exception as e:
    print(f"Error checking table: {e}")

# Pokaż istniejących użytkowników
print("=== Existing users ===")
for u in User.objects.all():
    print(f"  - {u.username} (id={u.id}, is_superuser={u.is_superuser})")

# Utwórz lub zaktualizuj użytkownika krzysztof
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'krzysztof')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'krzysztof@fakturex.pl')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'magia2')

print(f"=== Creating user: {username} ===")

try:
    # Usuń istniejącego użytkownika i stwórz nowego z nowym hasłem
    user, created = User.objects.get_or_create(username=username, defaults={
        'email': email,
        'is_staff': True,
        'is_superuser': True,
    })

    # Zawsze resetuj hasło
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()
    
    if created:
        print(f'SUCCESS: Superuser {username} created')
    else:
        print(f'SUCCESS: Superuser {username} updated - password reset')
    
    # Weryfikacja hasła
    from django.contrib.auth import authenticate
    test_user = authenticate(username=username, password=password)
    if test_user:
        print(f'VERIFIED: Password for {username} works!')
    else:
        print(f'WARNING: Password verification failed for {username}')
    
    # Weryfikacja
    final_count = User.objects.count()
    print(f"=== Final user count: {final_count} ===")
    
except Exception as e:
    print(f"ERROR creating user: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
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
