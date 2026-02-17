from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User


class LoginView(APIView):
    """Logowanie użytkownika - zwraca tokeny JWT"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Podaj nazwę użytkownika i hasło'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response(
                {'error': 'Nieprawidłowa nazwa użytkownika lub hasło'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })


class LogoutView(APIView):
    """Wylogowanie - blacklist refresh token"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Wylogowano pomyślnie'})
        except Exception:
            return Response({'message': 'Wylogowano pomyślnie'})


class MeView(APIView):
    """Pobierz dane zalogowanego użytkownika"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })


class ChangePasswordView(APIView):
    """Zmiana hasła zalogowanego użytkownika"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not current_password or not new_password:
            return Response(
                {'error': 'Podaj aktualne hasło i nowe hasło'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != confirm_password:
            return Response(
                {'error': 'Nowe hasła nie są identyczne'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 6:
            return Response(
                {'error': 'Hasło musi mieć co najmniej 6 znaków'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        if not user.check_password(current_password):
            return Response(
                {'error': 'Aktualne hasło jest nieprawidłowe'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Hasło zostało zmienione'})


class UserListView(APIView):
    """Lista wszystkich użytkowników"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        users = User.objects.all().order_by('username')
        return Response([{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_active': u.is_active,
            'is_staff': u.is_staff,
            'date_joined': u.date_joined,
        } for u in users])


class UserCreateView(APIView):
    """Tworzenie nowego użytkownika"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email', '')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not username or not password:
            return Response(
                {'error': 'Nazwa użytkownika i hasło są wymagane'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 6:
            return Response(
                {'error': 'Hasło musi mieć co najmniej 6 znaków'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Użytkownik o takiej nazwie już istnieje'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'message': 'Użytkownik utworzony pomyślnie'
        }, status=status.HTTP_201_CREATED)


class UserDeleteView(APIView):
    """Usuwanie użytkownika"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Użytkownik nie istnieje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Nie pozwól usunąć samego siebie
        if user.id == request.user.id:
            return Response(
                {'error': 'Nie możesz usunąć własnego konta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        username = user.username
        user.delete()
        
        return Response({'message': f'Użytkownik {username} został usunięty'})