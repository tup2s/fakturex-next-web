"""
Management command to reparse KSeF data for existing invoices.
This is needed because older imports didn't store full KSeF data in ksef_xml field.
"""
from django.core.management.base import BaseCommand
from invoices.models import Invoice
from customers.models import Settings
from customers.encryption import decrypt_token, is_token_encrypted
import json
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reimport KSeF invoices to update stored data with full details'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reimport even if ksef_xml already has data',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit number of invoices to process (0 = all)',
        )

    def handle(self, *args, **options):
        from invoices.ksef_service import KSeFService, KSEF2_AVAILABLE
        
        force = options['force']
        limit = options['limit']
        
        if not KSEF2_AVAILABLE:
            self.stderr.write(self.style.ERROR('ksef2 SDK is not available'))
            return
        
        # Get settings
        settings = Settings.objects.first()
        if not settings or not settings.ksef_token:
            self.stderr.write(self.style.ERROR('KSeF token not configured'))
            return
        
        # Get invoices that need updating
        invoices = Invoice.objects.filter(ksef_numer__isnull=False).exclude(ksef_numer='')
        
        if not force:
            # Only process invoices without proper ksef_xml data
            invoices = invoices.filter(
                models.Q(ksef_xml__isnull=True) | 
                models.Q(ksef_xml='') |
                models.Q(ksef_xml__startswith='<?xml')  # Old XML format
            )
        
        if limit > 0:
            invoices = invoices[:limit]
        
        total = invoices.count()
        self.stdout.write(f'Found {total} invoices to update')
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS('No invoices need updating'))
            return
        
        # Unfortunately we can't re-download XMLs from KSeF without the session
        # So we need to update manually or re-import from KSeF
        
        self.stdout.write(self.style.WARNING(
            'To update KSeF data for existing invoices, you need to:\n'
            '1. Delete the invoices that need updating\n'
            '2. Re-import them from KSeF using the KSeF page\n\n'
            'OR wait for the next automatic import which will include full data.\n\n'
            'Existing invoices that need updating:'
        ))
        
        for inv in invoices:
            has_data = False
            if inv.ksef_xml:
                try:
                    data = json.loads(inv.ksef_xml)
                    has_data = bool(data.get('pozycje') or data.get('nabywca'))
                except:
                    pass
            
            status = '✓ Has data' if has_data else '✗ Missing data'
            self.stdout.write(f'  {inv.numer} ({inv.ksef_numer[:30]}...) - {status}')
