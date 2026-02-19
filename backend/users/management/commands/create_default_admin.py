from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = 'Creates a default admin user if none exists'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Sprawdź czy istnieje jakikolwiek superuser
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('Superuser already exists. Skipping.'))
            return
        
        # Pobierz dane z env lub użyj domyślnych
        username = os.environ.get('DJANGO_ADMIN_USERNAME', 'admin')
        email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@fakturex.pl')
        password = os.environ.get('DJANGO_ADMIN_PASSWORD', 'FakturexAdmin2026!')
        
        # Utwórz superusera
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {username}'))
