from django.urls import path, include

urlpatterns = [
    path('invoices/', include('invoices.urls')),
    path('customers/', include('customers.urls')),
    path('products/', include('products.urls')),
    path('users/', include('users.urls')),
]