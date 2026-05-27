from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Profile


class IsEmailVerified(BasePermission):
    message = 'Verify your email to access this resource.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        profile, _ = Profile.objects.get_or_create(user=user)
        # Admins and superusers bypass email verification
        if profile.role == 'ADMIN' or user.is_superuser:
            return True
        return bool(profile.is_email_verified)


class IsAdminRole(BasePermission):
    message = 'Admin role required.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == 'ADMIN' or request.user.is_superuser


class InventoryRoleAccess(BasePermission):
    """ADMIN/STAFF: full access. USER: read-only + safe custom actions."""

    message = 'Insufficient permissions for this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        profile, _ = Profile.objects.get_or_create(user=user)
        
        # Only check email verification for non-admins
        if not profile.is_email_verified:
            if profile.role != 'ADMIN' and not user.is_superuser:
                return False
        
        role = profile.role

        # 1. ADMIN has full access (CRUD)
        if role == 'ADMIN' or user.is_superuser:
            return True

        # 2. For non-admins, check if they are trying to Edit (PUT/PATCH) or Delete
        if request.method in ('PUT', 'PATCH', 'DELETE'):
            self.message = 'Only Admins can Edit or Delete data.'
            return False

        # 3. STAFF can Create (POST) and Read (GET)
        if role == 'STAFF':
            return True

        # 4. USER is Read-Only
        if role == 'USER':
            return request.method in SAFE_METHODS

        return False

