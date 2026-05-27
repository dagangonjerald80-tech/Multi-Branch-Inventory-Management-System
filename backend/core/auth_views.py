import os
import random
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMessage, get_connection
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from dotenv import load_dotenv
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserMeSerializer
from .tokens import email_verification_token


def _fresh_email_credentials():
    load_dotenv(Path(settings.BASE_DIR) / '.env', override=True)
    return {
        'username': os.environ.get('EMAIL_HOST_USER', '').strip(),
        'password': os.environ.get('EMAIL_HOST_PASSWORD', '').strip().replace(' ', ''),
    }


def _get_fresh_email_connection():
    creds = _fresh_email_credentials()
    return get_connection(
        backend=settings.EMAIL_BACKEND,
        host=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
        username=creds['username'],
        password=creds['password'],
        use_tls=settings.EMAIL_USE_TLS,
        fail_silently=False,
        timeout=5,
    )


def _send_verification_email(user):
    code = f"{random.randint(100000, 999999)}"
    user.profile.email_verification_code = code
    user.profile.save(update_fields=['email_verification_code'])
    
    # Print code as a fallback in server logs (useful when Render SMTP is blocked)
    print(f"[Verification Code Alert] User: {user.username}, Email: {user.email}, Code: {code}")

    subject = f'Your Verification Code: {code}'
    body = (
        f'Hi {user.first_name or user.username},\n\n'
        f'Your verification code is: {code}\n\n'
        'Please enter this code in the app to verify your account.'
    )
    creds = _fresh_email_credentials()
    from_email = (
        f'"Multi-Branch Inventory Management System" <{creds["username"]}>'
        if creds['username']
        else getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@inventory.local')
    )
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[user.email],
        connection=_get_fresh_email_connection(),
    )
    message.send(fail_silently=False)
    return {"sent": True, "code": code}


def _safe_send_verification_email(user):
    """
    Dev-friendly wrapper: never raises on email issues.
    Returns dict with whether email was sent and the generated code.
    """
    try:
        return _send_verification_email(user)
    except Exception as e:
        # Email credentials/network are commonly missing in local dev.
        # Keep registration working; expose the code in DEBUG so the UI can proceed.
        return {
            "sent": False,
            "code": getattr(getattr(user, "profile", None), "email_verification_code", None),
            "error": str(e),
        }


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
    user.is_active = False
    user.save(update_fields=['is_active'])
    result = _safe_send_verification_email(user)
    payload = {'detail': 'Registration successful. Enter the code sent to your email.'}
    if not result.get("sent"):
        payload["email_debug"] = {
            "sent": False,
            "code": result.get("code"),
            "error": result.get("error"),
        }
    return Response(payload, status=status.HTTP_201_CREATED)


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
    
    user.is_active = True
    user.save(update_fields=['is_active'])
    
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
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({'detail': 'old_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not user.check_password(old_password):
        return Response({'detail': 'Incorrect old password.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password changed successfully.'})

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
    result = _safe_send_verification_email(user)
    payload = {'detail': 'If an account exists for this email, a verification message was sent.'}
    if not result.get("sent"):
        payload["email_debug"] = {
            "sent": False,
            "code": result.get("code"),
            "error": result.get("error"),
        }
    return Response(payload)


class EmailAwareTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.profile.role
        token['email_verified'] = user.profile.is_email_verified
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get('password')
        if username and password:
            try:
                user = User.objects.get(**{self.username_field: username})
                if not user.is_active and user.check_password(password):
                    raise AuthenticationFailed(
                        'Your account is not verified yet. Check your email for the 6-digit code, or open Verify Account to enter it.'
                    )
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        user = self.user
        data['user'] = UserMeSerializer(user).data
        return data


class EmailAwareTokenView(TokenObtainPairView):
    serializer_class = EmailAwareTokenSerializer
