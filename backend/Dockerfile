FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Collect static files (SECRET_KEY will be provided at runtime)
RUN SECRET_KEY=temp-build-key python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run migrations and start server (secrets provided via runtime environment)
CMD ["sh", "-c", "set -e && echo '=== Starting Fakturex Backend ===' && python check_db.py && echo '=== Running migrations ===' && python manage.py showmigrations && python manage.py migrate --verbosity 2 && echo '=== Migrations complete ===' && python check_db.py && echo '=== Creating superuser ===' && python create_superuser.py && echo '=== Starting Gunicorn ===' && gunicorn fakturex.wsgi --bind 0.0.0.0:${PORT:-8000}"]
