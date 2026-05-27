from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsEmailVerified(BasePermission):
    message = 'Verify your email to access this resource.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        try:
            profile = user.profile
            return bool(profile and profile.is_email_verified)
        except Exception:
            return False


class IsAdminRole(BasePermission):
    message = 'Admin role required.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        try:
            profile = user.profile
            return bool(profile and profile.role == 'ADMIN')
        except Exception:
            return False


class InventoryRoleAccess(BasePermission):
    """ADMIN/STAFF: full access. USER: read-only + safe custom actions."""

    message = 'Insufficient permissions for this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        try:
            profile = user.profile
            if not profile or not profile.is_email_verified:
                return False
            
            role = profile.role

            # 1. ADMIN has full access (CRUD)
            if role == 'ADMIN':
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
        except Exception:
            return False
