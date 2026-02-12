# Email Tracker - Testing Guide

## Test the Email API

You can test the email sending with this curl command or using Postman:

### Using Command Line (curl):
```bash
curl -X POST http://localhost:3000/send-email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"recipient@example.com\",\"subject\":\"Test Email\",\"htmlBody\":\"<h1>Hello</h1><p>This is a test email with tracking.</p>\"}"
```

### Using Postman or any HTTP client:
**URL:** `POST http://localhost:3000/send-email`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "your-recipient@gmail.com",
  "subject": "Test Email Subject",
  "htmlBody": "<h1>Hello World</h1><p>This is your email content from textarea.</p><p>All spaces and formatting are preserved.</p>"
}
```

## Check Server Logs

When you send an email, you should see console logs like:
```
Received request: { email: 'test@example.com', subject: 'Test', htmlBodyLength: 50 }
Sending email to: test@example.com
Subject: Test
HTML Body length: 50
HTML Body preview: <h1>Hello World</h1>...
Email sent successfully: <message-id>
```

## Common Issues

1. **Email not showing body**: Check the console logs to see if `htmlBody` is being received
2. **Authentication error**: Make sure `.env` file has correct email and password
3. **Tracking pixel not injected**: Check that `BASE_URL` in `.env` is correct
