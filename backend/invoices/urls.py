from django.urls import path
from . import views

urlpatterns = [
    path('', views.InvoiceList.as_view(), name='invoice-list'),
    path('create/', views.InvoiceCreate.as_view(), name='invoice-create'),
    path('<int:pk>/', views.InvoiceDetail.as_view(), name='invoice-detail'),
    path('<int:pk>/update/', views.InvoiceUpdate.as_view(), name='invoice-update'),
    path('<int:pk>/delete/', views.InvoiceDelete.as_view(), name='invoice-delete'),
]