from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db import transaction, models
from django.contrib.auth.models import User

from .chatbot_logic import build_reply, dashboard_stats_payload
from .models import Branch, Product, Stock, StockTransfer, StockMovementHistory, Supplier
from .permissions import InventoryRoleAccess, IsAdminRole, IsEmailVerified
from .serializers import (
    AdminManageUserSerializer,
    BranchSerializer,
    ProductSerializer,
    StockSerializer,
    StockMovementHistorySerializer,
    StockTransferSerializer,
    SupplierSerializer,
    UserMeSerializer,
    UserSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    base = request.build_absolute_uri('/api/').rstrip('/')
    return Response(
        {
            'title': 'Multi-Branch Inventory Management API',
            'description': 'Web and mobile clients authenticate via JWT; email verification unlocks data access.',
            'auth': {
                'register': f'{base}/auth/register/',
                'login': f'{base}/auth/login/',
                'token_refresh': f'{base}/auth/token/refresh/',
                'verify_email': f'{base}/auth/verify-email/',
                'resend_verification': f'{base}/auth/resend-verification/',
                'change_email': f'{base}/auth/change-email/',
            },
            'chat': {'url': f'{base}/chat/', 'description': 'Authenticated chatbot (same intents as web widget).'},
            'core_features': {
                'branches': {'url': f'{base}/branches/'},
                'products': {'url': f'{base}/products/'},
                'stocks': {'url': f'{base}/stocks/'},
                'transfers': {'url': f'{base}/transfers/'},
                'history': {'url': f'{base}/history/'},
                'dashboard': {'url': f'{base}/dashboard/'},
                'suppliers': {'url': f'{base}/suppliers/'},
                'users': {'url': f'{base}/users/', 'me': f'{base}/users/me/'},
            },
        }
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsEmailVerified])
def chat_message(request):
    message = request.data.get('message', '')
    if not isinstance(message, str) or not message.strip():
        return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(message) > 2000:
        return Response({'detail': 'message is too long (max 2000 characters).'}, status=status.HTTP_400_BAD_REQUEST)

    def branches_list():
        return list(BranchSerializer(Branch.objects.all(), many=True).data)

    def products_list():
        return list(ProductSerializer(Product.objects.all(), many=True, context={'request': request}).data)

    def stocks_low():
        qs = Stock.objects.filter(quantity__lte=models.F('low_stock_threshold'))
        return list(StockSerializer(qs, many=True).data)

    def transfers_list():
        return list(
            StockTransferSerializer(StockTransfer.objects.all().order_by('-created_at'), many=True).data
        )

    def history_list():
        return list(
            StockMovementHistorySerializer(
                StockMovementHistory.objects.all().order_by('-date'), many=True
            ).data
        )

    callables = {
        'dashboard_get': dashboard_stats_payload,
        'stocks_low': stocks_low,
        'branches_list': branches_list,
        'products_list': products_list,
        'transfers_list': transfers_list,
        'history_list': history_list,
    }
    try:
        reply = build_reply(message, callables)
    except Exception as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    return Response({'reply': reply})


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]

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
                performed_by=request.user if request.user.is_authenticated else None,
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
            stock, _created = Stock.objects.get_or_create(
                branch_id=branch_id,
                product_id=product_id,
                defaults={'quantity': 0},
            )
            stock.quantity += quantity
            stock.save()

            StockMovementHistory.objects.create(
                branch_id=branch_id,
                product_id=product_id,
                movement_type='IN',
                quantity=quantity,
                reference='Stock Assignment',
                performed_by=request.user if request.user.is_authenticated else None,
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
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]

    @action(detail=True, methods=['post'])
    def complete_transfer(self, request, pk=None):
        transfer = self.get_object()

        if transfer.status != 'PENDING':
            return Response({'error': 'Transfer is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
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

            dest_stock, _created = Stock.objects.select_for_update().get_or_create(
                branch=transfer.to_branch,
                product=transfer.product,
                defaults={'quantity': 0},
            )
            dest_stock.quantity += transfer.quantity
            dest_stock.save()

            transfer.status = 'COMPLETED'
            transfer.save()

            StockMovementHistory.objects.create(
                branch=transfer.from_branch,
                product=transfer.product,
                movement_type='TRANSFER',
                quantity=transfer.quantity,
                reference=f'Transfer OUT #{transfer.id}',
                performed_by=request.user if request.user.is_authenticated else None,
            )
            StockMovementHistory.objects.create(
                branch=transfer.to_branch,
                product=transfer.product,
                movement_type='TRANSFER',
                quantity=transfer.quantity,
                reference=f'Transfer IN #{transfer.id}',
                performed_by=request.user if request.user.is_authenticated else None,
            )

        return Response({'status': 'Transfer completed successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel_transfer(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'PENDING':
            return Response(
                {'error': 'Cannot cancel a transfer that is not pending'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').all().order_by('id')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AdminManageUserSerializer
        if self.action == 'me':
            return UserMeSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated(), IsEmailVerified()]
        if self.action in ('create', 'destroy', 'update', 'partial_update'):
            return [IsAuthenticated(), IsEmailVerified(), IsAdminRole()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
        qs = User.objects.select_related('profile').all().order_by('id')
        role = getattr(user.profile, 'role', None)
        if role == 'ADMIN':
            return qs
        return qs.filter(pk=user.pk)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(
        detail=False,
        methods=['get', 'patch'],
        url_path='me',
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def me(self, request):
        if request.method == 'GET':
            serializer = UserMeSerializer(request.user, context={'request': request})
            return Response(serializer.data)
        serializer = UserMeSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserMeSerializer(request.user, context={'request': request}).data)


class DashboardStatsView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsEmailVerified, InventoryRoleAccess]

    def list(self, request):
        data = dashboard_stats_payload()
        return Response(data)
