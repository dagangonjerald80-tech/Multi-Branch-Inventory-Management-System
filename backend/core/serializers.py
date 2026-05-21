from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Branch,
    Product,
    Profile,
    Stock,
    StockMovementHistory,
    StockTransfer,
    Supplier,
)


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

    def validate_name(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value

    def validate_location(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('Location must be at least 2 characters.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'sku',
            'price',
            'supplier',
            'supplier_name',
            'image',
            'image_url',
        ]

    def validate_name(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value

    def validate_sku(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('SKU must be at least 2 characters.')
        return value

    def validate_image(self, img):
        if img and img.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('Image must be 2MB or smaller.')
        return img

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

    def validate_name(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    branch_id = serializers.ReadOnlyField(source='profile.branch_id', read_only=True)
    branch_name = serializers.ReadOnlyField(source='profile.branch.name', read_only=True)
    is_email_verified = serializers.BooleanField(source='profile.is_email_verified', read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'branch_id',
            'branch_name',
            'is_email_verified',
            'avatar_url',
        ]

    def get_avatar_url(self, obj):
        avatar = getattr(obj.profile, 'avatar', None)
        if not avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(avatar.url)
        return avatar.url


class UserMeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    branch_id = serializers.ReadOnlyField(source='profile.branch_id', read_only=True)
    branch_name = serializers.ReadOnlyField(source='profile.branch.name', read_only=True)
    is_email_verified = serializers.BooleanField(source='profile.is_email_verified', read_only=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'branch_id',
            'branch_name',
            'is_email_verified',
            'avatar',
            'avatar_url',
        ]
        read_only_fields = ['id', 'username', 'role', 'branch_name', 'is_email_verified']

    def get_avatar_url(self, obj):
        avatar = getattr(obj.profile, 'avatar', None)
        if not avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(avatar.url)
        return avatar.url

    def validate_email(self, value):
        value = (value or '').strip().lower()
        user = self.instance
        if user and User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value

    def validate_avatar(self, img):
        if img and img.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('Avatar must be 2MB or smaller.')
        return img

    def update(self, instance, validated_data):
        avatar = validated_data.pop('avatar', None)
        new_email = validated_data.get('email')
        if new_email and new_email.lower() != (instance.email or '').lower():
            instance.profile.is_email_verified = False
            instance.profile.save(update_fields=['is_email_verified'])
        user = super().update(instance, validated_data)
        if avatar is not None:
            user.profile.avatar = avatar
            user.profile.save(update_fields=['avatar'])
        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    password_confirm = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'username': {'min_length': 3},
        }

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_username(self, value):
        value = (value or '').strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        email = validated_data['email'].lower()
        validated_data['email'] = email
        return User.objects.create_user(password=password, **validated_data)


class AdminManageUserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Profile.ROLES, write_only=True, required=False)
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), allow_null=True, required=False
    )
    password = serializers.CharField(write_only=True, required=False, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'branch', 'password', 'is_staff')

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if self.instance and User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Email already in use.')
        if not self.instance and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already in use.')
        return value

    def create(self, validated_data):
        role = validated_data.pop('role', 'STAFF')
        branch = validated_data.pop('branch', None)
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Password is required when creating a user.'})
        is_staff = validated_data.pop('is_staff', False)
        user = User.objects.create_user(password=password, **validated_data)
        user.profile.branch = branch
        user.profile.role = role
        if role in ('ADMIN', 'STAFF'):
            user.profile.is_email_verified = True
        user.profile.save()
        user.is_staff = bool(is_staff) or role in ('ADMIN', 'STAFF')
        user.save(update_fields=['is_staff'])
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', serializers.empty)
        branch = validated_data.pop('branch', serializers.empty)
        password = validated_data.pop('password', serializers.empty)
        user = super().update(instance, validated_data)
        if branch is not serializers.empty:
            user.profile.branch = branch
        if role is not serializers.empty:
            user.profile.role = role
        if password is not serializers.empty:
            user.set_password(password)
            user.save(update_fields=['password'])
        user.profile.save()
        return user


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_sku = serializers.ReadOnlyField(source='product.sku')
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = Stock
        fields = '__all__'

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Quantity cannot be negative.')
        return value


class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    from_branch_name = serializers.ReadOnlyField(source='from_branch.name')
    to_branch_name = serializers.ReadOnlyField(source='to_branch.name')

    class Meta:
        model = StockTransfer
        fields = '__all__'

    def validate(self, data):
        from_branch = data.get('from_branch')
        product = data.get('product')
        quantity = data.get('quantity')

        if from_branch == data.get('to_branch'):
            raise serializers.ValidationError({'error': 'Source and destination branches cannot be the same.'})

        if quantity is not None and quantity <= 0:
            raise serializers.ValidationError({'error': 'Quantity must be greater than zero.'})

        try:
            source_stock = Stock.objects.get(branch=from_branch, product=product)
            if source_stock.quantity < quantity:
                raise serializers.ValidationError(
                    {'error': f'Insufficient stock at {from_branch.name}. Available: {source_stock.quantity}'}
                )
        except Stock.DoesNotExist:
            raise serializers.ValidationError(
                {'error': f'No stock record found for {product.name} at {from_branch.name}.'}
            )

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
        return obj.date.strftime('%Y-%m-%d %H:%M:%S')
