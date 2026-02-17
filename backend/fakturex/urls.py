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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/invoices/', include('invoices.urls')),
    path('api/', include('customers.urls')),  # contractors/ i settings/
    path('api/auth/', include('users.urls')),  # login, logout, me, refresh
]