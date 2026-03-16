import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_backend.settings')
django.setup()

from core.models import Branch, Product, Stock, StockMovementHistory, StockTransfer

def clean():
    StockTransfer.objects.all().delete()
    StockMovementHistory.objects.all().delete()
    Stock.objects.all().delete()
    Product.objects.all().delete()
    Branch.objects.all().delete()
    print("DATABASE_CLEANED")

if __name__ == "__main__":
    clean()
