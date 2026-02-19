"""
Django management command to migrate data from SQLite (faktury.db) to PostgreSQL.
"""
import sqlite3
from datetime import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from invoices.models import Invoice
from customers.models import Contractor


class Command(BaseCommand):
    help = 'Migrate data from SQLite faktury.db to PostgreSQL'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sqlite-path',
            type=str,
            default='faktury.db',
            help='Path to SQLite database file'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually migrating'
        )

    def handle(self, *args, **options):
        sqlite_path = options['sqlite_path']
        dry_run = options['dry_run']
        
        self.stdout.write(f'Connecting to SQLite database: {sqlite_path}')
        
        try:
            conn = sqlite3.connect(sqlite_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to connect to SQLite: {e}'))
            return
        
        # Check existing counts
        existing_contractors = Contractor.objects.count()
        existing_invoices = Invoice.objects.count()
        self.stdout.write(f'Existing records in PostgreSQL:')
        self.stdout.write(f'  - Contractors: {existing_contractors}')
        self.stdout.write(f'  - Invoices: {existing_invoices}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN MODE ===\n'))
        
        # Migrate contractors
        self.stdout.write('\n--- Migrating Contractors ---')
        contractors_migrated = self.migrate_contractors(cursor, dry_run)
        
        # Migrate invoices
        self.stdout.write('\n--- Migrating Invoices ---')
        invoices_migrated = self.migrate_invoices(cursor, dry_run)
        
        conn.close()
        
        self.stdout.write(self.style.SUCCESS(f'\n=== Migration Complete ==='))
        self.stdout.write(f'Contractors migrated: {contractors_migrated}')
        self.stdout.write(f'Invoices migrated: {invoices_migrated}')

    def migrate_contractors(self, cursor, dry_run):
        cursor.execute('SELECT nazwa, nip FROM kontrahenci')
        rows = cursor.fetchall()
        
        migrated = 0
        skipped = 0
        
        for row in rows:
            nazwa = row['nazwa'].strip() if row['nazwa'] else ''
            nip = row['nip'].strip() if row['nip'] else ''
            
            if not nazwa:
                continue
            
            # Check if contractor already exists
            if Contractor.objects.filter(nazwa=nazwa).exists():
                skipped += 1
                continue
            
            if dry_run:
                self.stdout.write(f'  [DRY] Would create: {nazwa} (NIP: {nip or "brak"})')
            else:
                Contractor.objects.create(
                    nazwa=nazwa,
                    nip=nip
                )
            migrated += 1
        
        self.stdout.write(f'  Migrated: {migrated}, Skipped (already exist): {skipped}')
        return migrated

    def migrate_invoices(self, cursor, dry_run):
        cursor.execute('''
            SELECT numer, data, kwota, dostawca, termin_platnosci, status, 
                   type, ksef_number, ksef_status, ksef_upo, is_imported_from_ksef
            FROM faktury
        ''')
        rows = cursor.fetchall()
        
        migrated = 0
        skipped = 0
        errors = 0
        
        # Build contractor lookup
        contractor_lookup = {}
        for c in Contractor.objects.all():
            contractor_lookup[c.nazwa.lower()] = c
        
        invoices_to_create = []
        
        for row in rows:
            numer = row['numer']
            
            # Check if invoice already exists
            if Invoice.objects.filter(numer=numer).exists():
                skipped += 1
                continue
            
            try:
                # Parse data
                data = row['data']
                if isinstance(data, str):
                    data = datetime.strptime(data, '%Y-%m-%d').date()
                
                termin = row['termin_platnosci']
                if isinstance(termin, str):
                    termin = datetime.strptime(termin, '%Y-%m-%d').date()
                elif termin is None:
                    termin = data
                
                kwota = Decimal(str(row['kwota']))
                dostawca = row['dostawca'].strip() if row['dostawca'] else ''
                
                # Map status
                status_raw = row['status'].lower() if row['status'] else 'niezapłacona'
                if status_raw in ['zapłacona', 'zaplacona', 'paid']:
                    status = 'zaplacona'
                else:
                    status = 'niezaplacona'
                
                # Find contractor
                kontrahent = contractor_lookup.get(dostawca.lower())
                
                # KSeF data
                ksef_numer = row['ksef_number'] or ''
                
                if dry_run:
                    self.stdout.write(f'  [DRY] Would create: {numer} - {dostawca} ({kwota})')
                else:
                    invoices_to_create.append(Invoice(
                        numer=numer,
                        data=data,
                        kwota=kwota,
                        dostawca=dostawca,
                        termin_platnosci=termin,
                        status=status,
                        kontrahent=kontrahent,
                        ksef_numer=ksef_numer
                    ))
                migrated += 1
                
            except Exception as e:
                errors += 1
                self.stderr.write(self.style.WARNING(f'  Error processing invoice {numer}: {e}'))
        
        # Bulk create for efficiency
        if not dry_run and invoices_to_create:
            with transaction.atomic():
                Invoice.objects.bulk_create(invoices_to_create, batch_size=100)
        
        self.stdout.write(f'  Migrated: {migrated}, Skipped (already exist): {skipped}, Errors: {errors}')
        return migrated
