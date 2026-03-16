from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

class Branch(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    
    def __str__(self):
        return self.name

class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Profile(models.Model):
    ROLES = [
        ('ADMIN', 'Global Admin'),
        ('STAFF', 'Branch Staff'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLES, default='STAFF')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    def __str__(self):
        return self.name

class Stock(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stocks')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stocks')
    quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=10)

    class Meta:
        unique_together = ('branch', 'product')

    def __str__(self):
        return f"{self.product.name} at {self.branch.name} ({self.quantity})"

class StockTransfer(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    from_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_out')
    to_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transfers_in')
    quantity = models.IntegerField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.quantity} of {self.product.name} from {self.from_branch.name} to {self.to_branch.name}"

class StockMovementHistory(models.Model):
    MOVEMENT_TYPES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('TRANSFER', 'Transfer'),
        ('SALE', 'Sale'),
    ]
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()
    reference = models.CharField(max_length=255, blank=True, null=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.movement_type} of {self.quantity} {self.product.name} at {self.branch.name}"
