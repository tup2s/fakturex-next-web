"""
Script to check table structures
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakturex.settings')
django.setup()

from django.db import connection

def show_columns(table_name):
    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, [table_name])
        columns = cursor.fetchall()
        print(f"\n=== {table_name} ({len(columns)} columns) ===")
        for col in columns:
            print(f"  {col[0]}: {col[1]} {'NULL' if col[2]=='YES' else 'NOT NULL'}")

# Check main tables
show_columns('invoices_invoice')
show_columns('customers_contractor')
show_columns('customers_settings')
show_columns('auth_user')
