from django.contrib import admin
from .models import Branch, Supplier, Profile, Product, Stock, StockTransfer, StockMovementHistory

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'location')
    search_fields = ('name', 'location')

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'contact_person', 'email', 'phone')
    search_fields = ('name', 'contact_person', 'email')

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'branch', 'is_email_verified')
    list_filter = ('role', 'is_email_verified', 'branch')
    search_fields = ('user__username', 'user__email')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'sku', 'price', 'supplier')
    search_fields = ('name', 'sku')
    list_filter = ('supplier',)

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'branch', 'quantity', 'low_stock_threshold')
    list_filter = ('branch', 'product')
    search_fields = ('product__name', 'product__sku')

@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'from_branch', 'to_branch', 'quantity', 'status', 'created_at')
    list_filter = ('status', 'from_branch', 'to_branch')
    search_fields = ('product__name',)

@admin.register(StockMovementHistory)
class StockMovementHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'movement_type', 'product', 'branch', 'quantity', 'date')
    list_filter = ('movement_type', 'branch', 'date')
    search_fields = ('product__name', 'reference')
