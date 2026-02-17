"""
Script to check database connection and list tables
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakturex.settings')
django.setup()

from django.db import connection

print("=== Database Check ===")
print(f"Database ENGINE: {connection.settings_dict['ENGINE']}")
print(f"Database NAME: {connection.settings_dict.get('NAME', 'N/A')}")
print(f"Database HOST: {connection.settings_dict.get('HOST', 'N/A')}")

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("Database connection: OK")
        
        # List existing tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print(f"Existing tables ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")
except Exception as e:
    print(f"Database connection FAILED: {e}")
