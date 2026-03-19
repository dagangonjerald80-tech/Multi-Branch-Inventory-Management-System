from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction, models
from .models import Branch, Product, Stock, StockTransfer, StockMovementHistory, Supplier
from .serializers import (
    BranchSerializer, ProductSerializer, StockSerializer,
    StockTransferSerializer, StockMovementHistorySerializer,
    SupplierSerializer, UserSerializer
)
from django.contrib.auth.models import User


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """Multi-Branch Inventory Management API - Core features only."""
    base = request.build_absolute_uri('/api/').rstrip('/')
    return Response({
        'title': 'Multi-Branch Inventory Management API',
        'description': 'Centralized backend for multiple store branches',
        'core_features': {
            'branches': {
                'url': f'{base}/branches/',
                'description': 'Create branches',
            },
            'products': {
                'url': f'{base}/products/',
                'description': 'Add products',
            },
            'stocks': {
                'url': f'{base}/stocks/',
                'description': 'Stock per branch — assign and query by branch (filter ?branch=id)',
                'actions': {
                    'add_stock': f'{base}/stocks/add_stock/',
                    'record_sale': f'{base}/stocks/record_sale/',
                    'low_stock': f'{base}/stocks/low_stock/',
                },
            },
            'transfers': {
                'url': f'{base}/transfers/',
                'description': 'Transfer stock between branches',
                'actions': {
                    'complete_transfer': f'{base}/transfers/{{id}}/complete_transfer/',
                    'cancel_transfer': f'{base}/transfers/{{id}}/cancel_transfer/',
                },
            },
            'history': {
                'url': f'{base}/history/',
                'description': 'View stock movement history (IN, OUT, TRANSFER, SALE)',
            },
            'low_stock_alerts': {
                'url': f'{base}/stocks/low_stock/',
                'description': 'Low stock alert logic',
            },
        },
        'endpoints': {
            'branches': f'{base}/branches/',
            'products': f'{base}/products/',
            'stocks': f'{base}/stocks/',
            'transfers': f'{base}/transfers/',
            'history': f'{base}/history/',
            'dashboard': f'{base}/dashboard/',
        },
    })


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset

    @action(detail=False, methods=['post'])
    def record_sale(self, request):
        branch_id = request.data.get('branch_id')
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')
        
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                stock = Stock.objects.select_for_update().get(branch_id=branch_id, product_id=product_id)
            except Stock.DoesNotExist:
                return Response({'error': 'Stock record not found'}, status=status.HTTP_400_BAD_REQUEST)
                
            if stock.quantity < quantity:
                return Response({'error': 'Insufficient stock'}, status=status.HTTP_400_BAD_REQUEST)
            
            stock.quantity -= quantity
            stock.save()

            StockMovementHistory.objects.create(
                branch_id=branch_id,
                product_id=product_id,
                movement_type='SALE',
                quantity=quantity,
                reference='Retail Sale',
                performed_by=request.user if request.user.is_authenticated else None
            )

        return Response({'status': 'Sale recorded successfully'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def add_stock(self, request):
        branch_id = request.data.get('branch_id')
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')
        
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            stock, created = Stock.objects.get_or_create(
                branch_id=branch_id, product_id=product_id,
                defaults={'quantity': 0}
            )
            stock.quantity += quantity
            stock.save()

            StockMovementHistory.objects.create(
                branch_id=branch_id,
                product_id=product_id,
                movement_type='IN',
                quantity=quantity,
                reference='Stock Assignment',
                performed_by=request.user if request.user.is_authenticated else None
            )

        return Response({'status': 'Stock added successfully'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        low_stocks = Stock.objects.filter(quantity__lte=models.F('low_stock_threshold'))
        serializer = self.get_serializer(low_stocks, many=True)
        return Response(serializer.data)


class StockTransferViewSet(viewsets.ModelViewSet):
    queryset = StockTransfer.objects.all().order_by('-created_at')
    serializer_class = StockTransferSerializer

    @action(detail=True, methods=['post'])
    def complete_transfer(self, request, pk=None):
        transfer = self.get_object()
        
        if transfer.status != 'PENDING':
            return Response({'error': 'Transfer is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Deduct from source branch
            try:
                source_stock = Stock.objects.select_for_update().get(
                    branch=transfer.from_branch, product=transfer.product
                )
            except Stock.DoesNotExist:
                return Response({'error': 'Source stock record not found'}, status=status.HTTP_400_BAD_REQUEST)

            if source_stock.quantity < transfer.quantity:
                return Response({'error': 'Insufficient stock in source branch'}, status=status.HTTP_400_BAD_REQUEST)
            
            source_stock.quantity -= transfer.quantity
            source_stock.save()

            # Add to destination branch
            dest_stock, created = Stock.objects.select_for_update().get_or_create(
                branch=transfer.to_branch, product=transfer.product,
                defaults={'quantity': 0}
            )
            dest_stock.quantity += transfer.quantity
            dest_stock.save()

            transfer.status = 'COMPLETED'
            transfer.save()

            # Record history
            StockMovementHistory.objects.create(
                branch=transfer.from_branch, product=transfer.product,
                movement_type='TRANSFER', quantity=transfer.quantity,
                reference=f'Transfer OUT #{transfer.id}',
                performed_by=request.user if request.user.is_authenticated else None
            )
            StockMovementHistory.objects.create(
                branch=transfer.to_branch, product=transfer.product,
                movement_type='TRANSFER', quantity=transfer.quantity,
                reference=f'Transfer IN #{transfer.id}',
                performed_by=request.user if request.user.is_authenticated else None
            )

        return Response({'status': 'Transfer completed successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel_transfer(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'PENDING':
            return Response({'error': 'Cannot cancel a transfer that is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        transfer.status = 'CANCELLED'
        transfer.save()
        return Response({'status': 'Transfer cancelled successfully'}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        transfer = self.get_object()
        if transfer.status == 'COMPLETED':
            return Response({'error': 'Cannot delete a completed transfer.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class StockMovementHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovementHistory.objects.all().order_by('-date')
    serializer_class = StockMovementHistorySerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class DashboardStatsView(viewsets.ViewSet):
    def list(self, request):
        total_products = Product.objects.count()
        total_branches = Branch.objects.count()
        total_inventory = Stock.objects.aggregate(total=models.Sum('quantity'))['total'] or 0
        low_stock_alerts = Stock.objects.filter(quantity__lte=models.F('low_stock_threshold')).count()
        active_transfers = StockTransfer.objects.filter(status='PENDING').count()

        # Stock by branch for charts
        branches = Branch.objects.all()
        stock_by_branch = []
        for branch in branches:
            branch_stock = Stock.objects.filter(branch=branch).aggregate(total=models.Sum('quantity'))['total'] or 0
            stock_by_branch.append({
                'name': branch.name,
                'value': branch_stock
            })

        # Recent activities (simplified)
        recent_history = StockMovementHistory.objects.all().order_by('-date')[:5]
        activities = StockMovementHistorySerializer(recent_history, many=True).data

        return Response({
            'stats': {
                'total_products': total_products,
                'total_branches': total_branches,
                'total_inventory': total_inventory,
                'low_stock_alerts': low_stock_alerts,
                'active_transfers': active_transfers,
            },
            'stock_by_branch': stock_by_branch,
            'recent_activities': activities,
            'low_stock_items': StockSerializer(
                Stock.objects.filter(quantity__lte=models.F('low_stock_threshold')),
                many=True
            ).data,
            'sales_trend': self._get_sales_trend()
        })

    def _get_sales_trend(self):
        from django.utils import timezone
        from datetime import timedelta
        
        trend = []
        end_date = timezone.now()
        for i in range(6, -1, -1):
            date = end_date - timedelta(days=i)
            count = StockMovementHistory.objects.filter(
                movement_type='SALE',
                date__date=date.date()
            ).aggregate(total=models.Sum('quantity'))['total'] or 0
            trend.append({
                'date': date.strftime('%b %d'),
                'sales': count
            })
        return trend
