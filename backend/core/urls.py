from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import EmailAwareTokenView, register, resend_verification, verify_email, change_email, change_password
from .views import (
    api_root,
    chat_message,
    BranchViewSet,
    DashboardStatsView,
    ProductViewSet,
    StockMovementHistoryViewSet,
    StockTransferViewSet,
    StockViewSet,
    SupplierViewSet,
    UserViewSet,
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

urlpatterns = [
    path('', api_root),
    path('auth/register/', register),
    path('auth/login/', EmailAwareTokenView.as_view()),
    path('auth/token/refresh/', TokenRefreshView.as_view()),
    path('auth/verify-email/', verify_email),
    path('auth/resend-verification/', resend_verification),
    path('auth/change-email/', change_email),
    path('auth/change-password/', change_password),
    path('chat/', chat_message),
    path('', include(router.urls)),
]
