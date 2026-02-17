from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({'status': 'ok', 'message': 'Fakturex API'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/invoices/', include('invoices.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/products/', include('products.urls')),
    path('api/users/', include('users.urls')),
]