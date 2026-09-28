# PadosiPro — Design Document

## 1. Overview

PadosiPro is a mobile-first application for local service professionals. It lets users register, verify their email, set up a profile, and select from a catalogue of tasks they can perform.

## 2. User Journey

1. **Register** — email + password
2. **Verify Email** — 6-digit OTP sent to email
3. **Login** — email + password → JWT
4. **Profile Setup** — one-time screen: Name, Mobile, Address, Business Name
5. **Task Selection** — pick tasks from a seeded catalogue
6. **Home** — view selected tasks
7. **Logout**

## 3. Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Expo Mobile │ ──API──▶│  Express API │ ──SQL──▶│  PostgreSQL  │
│  (React Native)│        │  (Node.js)   │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  Mailpit     │
                         │  (Dev SMTP)  │
                         └──────────────┘
```

## 4. API Design

All responses follow a consistent shape:

### Success
```json
{ "success": true, "data": { ... } }
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "fields": { "email": "Invalid email format" }
  }
}
```

## 5. Security Considerations

- Passwords hashed with bcrypt (cost factor 12)
- JWT with short expiry for session tokens
- OTP: max 5 attempts, 10-minute expiry, 30-second resend cooldown
- All inputs validated with zod on the server
- CORS restricted in production
- No secrets in committed files

## 6. Database Schema

_To be defined in upcoming steps._

## 7. Evaluation Criteria

| Category                | Weight |
| ----------------------- | ------ |
| Working product         | 30%    |
| Backend & security      | 25%    |
| UI/UX                   | 20%    |
| Code quality & tests    | 15%    |
| Documentation           | 10%   |
