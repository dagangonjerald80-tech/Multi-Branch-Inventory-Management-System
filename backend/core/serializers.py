from rest_framework import serializers
from .models import Branch, Product, Stock, StockTransfer, StockMovementHistory, Supplier, Profile
from django.contrib.auth.models import User

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    class Meta:
        model = Product
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    branch_name = serializers.ReadOnlyField(source='profile.branch.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch_name']

class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_sku = serializers.ReadOnlyField(source='product.sku')
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = Stock
        fields = '__all__'

class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    from_branch_name = serializers.ReadOnlyField(source='from_branch.name')
    to_branch_name = serializers.ReadOnlyField(source='to_branch.name')

    class Meta:
        model = StockTransfer
        fields = '__all__'

    def validate(self, data):
        from .models import Stock
        from_branch = data.get('from_branch')
        product = data.get('product')
        quantity = data.get('quantity')

        if from_branch == data.get('to_branch'):
            raise serializers.ValidationError({"error": "Source and destination branches cannot be the same."})
        
        if quantity is not None and quantity <= 0:
            raise serializers.ValidationError({"error": "Quantity must be greater than zero."})

        # Check for stock availability at the source branch
        try:
            source_stock = Stock.objects.get(branch=from_branch, product=product)
            if source_stock.quantity < quantity:
                raise serializers.ValidationError({
                    "error": f"Insufficient stock at {from_branch.name}. Available: {source_stock.quantity}"
                })
        except Stock.DoesNotExist:
            raise serializers.ValidationError({
                "error": f"No stock record found for {product.name} at {from_branch.name}."
            })
            
        return data

class StockMovementHistorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    branch_name = serializers.ReadOnlyField(source='branch.name')
    performed_by_name = serializers.ReadOnlyField(source='performed_by.username')
    date_formatted = serializers.SerializerMethodField()

    class Meta:
        model = StockMovementHistory
        fields = '__all__'

    def get_date_formatted(self, obj):
        return obj.date.strftime("%Y-%m-%d %H:%M:%S")
