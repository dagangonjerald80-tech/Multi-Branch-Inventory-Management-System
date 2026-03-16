from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BranchViewSet, ProductViewSet, StockViewSet, 
    StockTransferViewSet, StockMovementHistoryViewSet,
    DashboardStatsView, SupplierViewSet, UserViewSet
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
    path('', include(router.urls)),
]
