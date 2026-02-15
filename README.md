# 📧 Email Tracker

A simple email tracking app that uses **pixel tracking** to detect whether an email has been opened.

## How It Works

A tiny 1×1 transparent tracking pixel is injected into every email sent through this app. When the recipient's email client loads the image, the server records the open event.

### Important Notes — Read Before Use

- **First view = email server fetch.** Every email is first fetched by the email server (e.g. Gmail), so the first recorded view is usually the server pre-fetching the image — not the actual recipient opening it. Sometimes this isn't the case.
- **Only tested with Gmail.**
- **Sent = it's sent.** If the email appears in your sent box, it was sent successfully.
- **Delivered badge.** If the dashboard shows "Delivered" on a sent email, it means the email server received it. Sometimes it doesn't show delivered yet the email was still sent — in that scenario the first view is logged as an actual view. When delivery _is_ confirmed, the second view (where "Opened" is displayed) is the real view.
- **Sender opens count as views.** If you open your own sent email, it will be marked as a view. There is no way to distinguish sender vs. recipient opens since we don't control the Gmail client.

> ⚠️ **Understand the working before use.**

## Setup

### 1. Create a Google App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Generate a new app password for "Mail"
3. Copy the 16-character password

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Email Configuration
SENDER_EMAIL=your_email@gmail.com
EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"   # Google app password

# Server Configuration
BASE_URL=https://your-deployed-url.vercel.app
PORT=3000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ...}

# Authentication
AUTH_USERNAME=your_username
AUTH_PASSWORD_HASH=your_sha256_password_hash
JWT_SECRET=random_64_char_string_for_access_tokens
JWT_REFRESH_SECRET=different_random_64_char_string_for_refresh_tokens

NODE_ENV=dev  #production for production
```

To generate the SHA-256 hash of your password:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('your_password').digest('hex'))"
```

### 3. Deploy

```bash
npm install
vercel --prod
```

> ⚠️ **Without deploying the app, email view tracking will not work.** The tracking pixel URL must be publicly accessible for email clients to load it.

> ℹ️ Since Vercel uses serverless functions, the first request after a period of inactivity may take a few seconds to load (cold start). Subsequent requests will be fast.

## Security

- **JWT authentication** with refresh token rotation
- Implements **OWASP Top 10** security recommendations:
  - Rate limiting on login (5 attempts / 15 min / IP)
  - Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
  - Timing-safe credential comparison
  - httpOnly cookies for refresh tokens
  - Short-lived access tokens (15 min)
  - Generic error messages (no credential leakage)

## API Endpoints

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with username & password. Returns access token in body, sets refresh token as httpOnly cookie. Rate-limited to 5 attempts per 15 min per IP. |
| `POST` | `/api/auth/refresh` | Rotate refresh token and get a new access token. Reads refresh token from cookie. |
| `POST` | `/api/auth/logout` | Revoke refresh token and clear the cookie. |

**Login request body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Login success response:**
```json
{
  "accessToken": "eyJhbG...",
  "expiresIn": 900
}
```

---

### Tracking (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/track/:id` | Tracking pixel endpoint. Embedded in emails as an image. Records an open event and returns a 1×1 transparent GIF. No authentication required — must be publicly accessible for email clients. |

---

### Email Sending (Protected — JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/send-email` | Send a tracked email. Automatically injects a tracking pixel into the email body. |

**Request body:**
```json
{
  "email": "recipient@example.com",
  "subject": "Hello",
  "htmlBody": "<p>Your email content here</p>"
}
```

**Response:**
```json
{
  "message": "Email sent with 1×1 tracking pixel",
  "trackingId": "abc123..."
}
```

---

### Analytics (Protected — JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/emails` | Get metadata of all tracked emails (subject, sent time, view count, status). Ordered by latest first. |
| `GET` | `/analytics/email/:id` | Get lightweight metadata for a single tracked email. |
| `GET` | `/analytics/email/:id/full` | Get full analytics for a single email, including every individual view event with timestamps. |

**All protected endpoints require the `Authorization` header:**
```
Authorization: Bearer <access_token>
```

**Example — single email metadata response:**
```json
{
  "id": "abc123",
  "subject": "Hello",
  "sentTime": { "_seconds": 1739438400 },
  "isOpened": true,
  "firstOpen": { "_seconds": 1739438500 },
  "viewsCount": 3
}
```

**Example — full analytics response:**
```json
{
  "id": "abc123",
  "subject": "Hello",
  "receiverEmail": "recipient@example.com",
  "sentTime": { "_seconds": 1739438400 },
  "mailSent": true,
  "isOpened": true,
  "firstOpen": { "_seconds": 1739438500 },
  "viewsCount": 3,
  "views": [
    { "time": { "_seconds": 1739438500 } },
    { "time": { "_seconds": 1739439000 } },
    { "time": { "_seconds": 1739440000 } }
  ]
}
```

---

### Debug (Protected — JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/image` | Returns a test SVG image. For manual debugging only. |

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/html/login.html` | Login page (only accessible page when not authenticated) |
| Dashboard | `/html/dashboard.html` | Lists all tracked emails with status |
| Send Email | `/html/email.html` | Form to send a tracked email |
| Analytics | `/html/analytics.html?id=:id` | Detailed analytics for a single email |

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** Firebase Firestore
- **Email:** Nodemailer (Gmail SMTP)
- **Auth:** JWT + httpOnly refresh cookies
- **Deployment:** Vercel
