"""Create inventory_db in PostgreSQL. Run once: python create_db.py"""
import psycopg

# Connect to default 'postgres' database (always exists)
conn = psycopg.connect(
    "host=localhost port=5432 dbname=postgres user=postgres password=123"
)
conn.autocommit = True
with conn.cursor() as cur:
    cur.execute("CREATE DATABASE inventory_db;")
    print("Database 'inventory_db' created successfully.")
conn.close()
