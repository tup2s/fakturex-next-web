from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        'status': 'ok', 
        'message': 'Fakturex API',
        'endpoints': {
            'invoices': '/api/invoices/',
            'contractors': '/api/contractors/',
            'settings': '/api/settings/',
        }
    })

def health_check(request):
    """Simple health check endpoint for Railway"""
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health-check'),
    path('api/', api_root, name='api-root'),
    path('api/invoices/', include('invoices.urls')),
    path('api/', include('customers.urls')),  # contractors/ i settings/
    path('api/auth/', include('users.urls')),  # login, logout, me, refresh
]