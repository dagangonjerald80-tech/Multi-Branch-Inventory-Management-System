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

class UserCreateSerializer(serializers.ModelSerializer):
    re_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 're_password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('re_password'):
            raise serializers.ValidationError({'re_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.is_active = False
        user.set_password(password)
        user.save()
        return user


class ProfileSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['role', 'branch', 'branch_name', 'phone', 'avatar', 'avatar_url']
        read_only_fields = ['role']

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return ''
        request = self.context.get('request')
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    branch = serializers.PrimaryKeyRelatedField(source='profile.branch', read_only=True)
    branch_name = serializers.ReadOnlyField(source='profile.branch.name', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'role', 'branch', 'branch_name', 'phone', 'avatar_url']

    def get_avatar_url(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile or not profile.avatar:
            return ''
        request = self.context.get('request')
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url


class ProfileUpdateSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id', 'email']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance

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
