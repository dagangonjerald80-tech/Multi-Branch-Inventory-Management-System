@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "MOBILE_DIR=%PROJECT_DIR%mobile"
set "LAN_IP=192.168.100.4"

echo.
echo Multi-Branch Inventory Mobile Demo
echo ----------------------------------
echo Phone and computer must be on the same Wi-Fi.
echo Using API URL: http://%LAN_IP%:8000/api
echo.
echo If Windows Firewall asks, click Allow access for python.exe and node.exe.
echo.

start "Django API - keep this open" cmd /k "cd /d ""%BACKEND_DIR%"" && python manage.py runserver 0.0.0.0:8000"

timeout /t 4 /nobreak >nul

start "Expo Go QR - scan this window" cmd /k "cd /d ""%MOBILE_DIR%"" && set EXPO_PUBLIC_API_URL=http://%LAN_IP%:8000/api&& set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%&& set EXPO_NO_DEPENDENCY_VALIDATION=1&& npx expo start --lan --clear --port 8081"

echo Two windows should now be open:
echo 1. Django API window
echo 2. Expo Go QR window
echo.
echo Wait until the Expo window shows a QR code, then scan it with Expo Go.
echo Do not close those two windows while using the app.
echo.
pause
