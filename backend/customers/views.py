from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Contractor, Settings
from .serializers import ContractorSerializer, SettingsSerializer


class ContractorViewSet(viewsets.ModelViewSet):
    """
    API ViewSet dla kontrahentów/dostawców.
    """
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    
    def get_queryset(self):
        queryset = Contractor.objects.all()
        
        # Wyszukiwanie
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                nazwa__icontains=search
            ) | queryset.filter(
                nip__icontains=search
            )
        
        return queryset


class SettingsView(APIView):
    """
    API View dla ustawień firmy (singleton).
    GET - pobierz ustawienia
    PUT/PATCH - zaktualizuj ustawienia
    """
    def get(self, request):
        settings = Settings.get_settings()
        serializer = SettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        settings = Settings.get_settings()
        serializer = SettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    def patch(self, request):
        settings = Settings.get_settings()
        serializer = SettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)