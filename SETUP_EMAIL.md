# Gmail email verification setup

## 1. Google account

1. Sign in to the Gmail account that will send verification emails.
2. Turn on **2-Step Verification**: [Google Account → Security](https://myaccount.google.com/security).

## 2. App Password

1. Open [App passwords](https://myaccount.google.com/apppasswords).
2. Create an app password (e.g. name: `Inventory Django`).
3. Copy the 16-character password (spaces are optional when pasting into `.env`).

## 3. Backend `.env`

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```env
EMAIL_HOST_USER=your.email@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
FRONTEND_VERIFY_URL=http://localhost:3000/verify-email
```

`DEFAULT_FROM_EMAIL` is set automatically from `EMAIL_HOST_USER` in Django settings.

## 4. Restart Django

Stop and start the Django dev server so it reloads `.env`.

## 5. Test

1. Start the React app (`my-app`, usually port 3000).
2. Register with a real inbox address, or use **Resend verification** on login.
3. Check the Gmail inbox for “Verify your inventory account”.
4. Click the link — it opens `http://localhost:3000/verify-email?uid=...&token=...` and confirms via the API.

## Troubleshooting

- **Authentication failed**: Use an App Password, not your normal Gmail password; confirm 2FA is on.
- **No email**: Check Django terminal for SMTP errors; confirm `backend/.env` exists and the server was restarted.
- **Link does not work**: Ensure `FRONTEND_VERIFY_URL` matches where the React app runs and includes `/verify-email`.
