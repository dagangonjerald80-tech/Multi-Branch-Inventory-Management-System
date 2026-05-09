from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    api_root, register_user, activate_user, jwt_create, current_user,
    BranchViewSet, ProductViewSet, StockViewSet,
    StockTransferViewSet, StockMovementHistoryViewSet,
    DashboardStatsView, SupplierViewSet, UserViewSet, ProfileViewSet
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet)
router.register(r'products', ProductViewSet)
router.register(r'stocks', StockViewSet)
router.register(r'transfers', StockTransferViewSet)
router.register(r'history', StockMovementHistoryViewSet)
router.register(r'dashboard', DashboardStatsView, basename='dashboard')
router.register(r'suppliers', SupplierViewSet)
router.register(r'users', UserViewSet)
router.register(r'profile', ProfileViewSet, basename='profile')

urlpatterns = [
    path('', api_root),
    path('auth/users/', register_user, name='register-user'),
    path('auth/users/activation/', activate_user, name='activate-user'),
    path('auth/users/me/', current_user, name='current-user'),
    path('auth/jwt/create/', jwt_create, name='jwt-create'),
    path('', include(router.urls)),
]
