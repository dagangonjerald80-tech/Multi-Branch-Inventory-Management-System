from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserMeSerializer
from .tokens import email_verification_token


import random

def _send_verification_email(user):
    code = f"{random.randint(100000, 999999)}"
    user.profile.email_verification_code = code
    user.profile.save(update_fields=['email_verification_code'])
    
    subject = f'Your Verification Code: {code}'
    body = (
        f'Hi {user.first_name or user.username},\n\n'
        f'Your verification code is: {code}\n\n'
        'Please enter this code in the app to verify your account.'
    )
    send_mail(
        subject,
        body,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@inventory.local'),
        [user.email],
        fail_silently=not settings.DEBUG,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = (request.data.get('email') or '').strip().lower()
    username = (request.data.get('username') or '').strip()
    if email:
        User.objects.filter(email__iexact=email).delete()
    if username:
        User.objects.filter(username__iexact=username).delete()
        
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    _send_verification_email(user)
    return Response(
        {'detail': 'Registration successful. Enter the code sent to your email.'},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = request.data.get('email')
    code = request.data.get('code')
    
    if not email or not code:
        return Response({'detail': 'email and code are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail': 'Invalid email or code.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if user.profile.is_email_verified:
        return Response({'detail': 'Email already verified.'})
        
    if user.profile.email_verification_code != code:
        return Response({'detail': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.profile.is_email_verified = True
    user.profile.email_verification_code = None
    user.profile.save(update_fields=['is_email_verified', 'email_verification_code'])
    
    return Response({'detail': 'Email verified. You can use the full application.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    user = request.user
    if user.profile.is_email_verified:
        return Response({'detail': 'Already verified.'}, status=status.HTTP_400_BAD_REQUEST)
        
    new_email = (request.data.get('email') or '').strip().lower()
    if not new_email:
        return Response({'detail': 'new email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
        return Response({'detail': 'This email is already taken by another account.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.email = new_email
    user.save(update_fields=['email'])
    
    # Send a fresh code to the new email
    try:
        _send_verification_email(user)
    except Exception:
        pass
        
    return Response({'detail': f'Email updated to {new_email}. A new code has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail': 'If an account exists for this email, a verification message was sent.'})
    if user.profile.is_email_verified:
        return Response({'detail': 'This account is already verified.'})
    _send_verification_email(user)
    return Response({'detail': 'If an account exists for this email, a verification message was sent.'})


class EmailAwareTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.profile.role
        token['email_verified'] = user.profile.is_email_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = UserMeSerializer(user).data
        return data


class EmailAwareTokenView(TokenObtainPairView):
    serializer_class = EmailAwareTokenSerializer
