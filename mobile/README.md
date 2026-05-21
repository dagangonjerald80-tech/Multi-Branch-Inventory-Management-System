# Inventory Mobile Frontend

Expo React Native mobile client for the Multi-Branch Inventory Management System.

## Connect to Django

The app uses the same Django API as the web React frontend:

```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

Set the mobile API URL to your computer's LAN IP so a phone can reach Django:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="http://YOUR-LAN-IP:8000/api"
npm start
```

Android emulator users can usually use:

```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000/api"
npm start
```

If you do not set `EXPO_PUBLIC_API_URL`, the app falls back to the API URL configured in `src/api.js`.

## Included Mobile Features

- JWT login, register, email verification, resend code, and change email.
- Dashboard stats, low stock alerts, branch stock distribution, and recent activity.
- Products, stock actions, branches, suppliers, and movement history.
- Stock transfer creation, completion, and cancellation.
- Profile editing and admin user role/branch updates.
- Authenticated inventory chatbot using the Django `/api/chat/` endpoint.
