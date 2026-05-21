from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db.models.signals import pre_save
from django.core.mail import send_mail
from django.conf import settings

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
        ('USER', 'Standard User'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLES, default='USER')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.is_superuser:
            role, verified = 'ADMIN', True
        elif instance.is_staff:
            role, verified = 'STAFF', True
        else:
            role, verified = 'USER', False
        Profile.objects.create(user=instance, role=role, is_email_verified=verified)

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
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    
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

@receiver(pre_save, sender=Stock)
def check_stock_before_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_stock = Stock.objects.get(pk=instance.pk)
            instance._was_low_stock = old_stock.quantity <= old_stock.low_stock_threshold
        except Stock.DoesNotExist:
            instance._was_low_stock = False
    else:
        instance._was_low_stock = False

@receiver(post_save, sender=Stock)
def send_low_stock_email(sender, instance, created, **kwargs):
    is_low_stock = instance.quantity <= instance.low_stock_threshold
    was_low_stock = getattr(instance, '_was_low_stock', False)
    
    if is_low_stock and not was_low_stock:
        subject = 'Low Stock Alert'
        body = f'Warning: {instance.product.name} in {instance.branch.name} is now below or equal to {instance.low_stock_threshold} items (Current: {instance.quantity}).'
        
        # Send to ADMIN and STAFF of that branch
        from django.db.models import Q
        users = User.objects.filter(
            Q(profile__role='ADMIN') | 
            Q(profile__role='STAFF', profile__branch=instance.branch)
        )
        emails = [u.email for u in users if u.email]
        
        if emails:
            try:
                send_mail(
                    subject,
                    body,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@inventory.local'),
                    emails,
                    fail_silently=not settings.DEBUG,
                )
            except Exception as e:
                print("Failed to send low stock alert:", e)
