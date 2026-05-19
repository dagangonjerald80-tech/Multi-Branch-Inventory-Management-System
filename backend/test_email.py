import os
import smtplib
import ssl
from dotenv import load_dotenv

# Load .env
load_dotenv()

email = os.getenv('EMAIL_HOST_USER')
password = os.getenv('EMAIL_HOST_PASSWORD')

print(f"Testing with: {email}")

message = """Subject: Test Email

This is a test email."""

try:
    # Create a secure SSL context and bypass verification
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls(context=context)
        server.login(email, password)
        server.sendmail(email, email, message)
    print("Email sent successfully using smtplib bypass!")
except Exception as e:
    print("Failed to send email:")
    print(e)
