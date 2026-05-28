import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

key = os.environ.get('RESEND_API_KEY', '').strip()
print(f"API Key found: {bool(key)}, starts with: {key[:12]}...")

data = {
    "from": "Multi-Branch Inventory <onboarding@resend.dev>",
    "to": ["dagangonjerald80@gmail.com"],
    "subject": "Test Verification Code: 123456",
    "html": "<p>Your verification code is: <strong>123456</strong></p>"
}

resp = requests.post(
    "https://api.resend.com/emails",
    headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    },
    json=data,
    timeout=10,
)

print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")
