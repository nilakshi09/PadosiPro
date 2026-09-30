# PadosiPro — Design Document

## Architecture

PadosiPro is a two-tier application: a **Node.js/Express REST API** backed by **PostgreSQL** (via Prisma ORM), and a **React Native mobile app** built with Expo. The backend handles registration, OTP-based email verification, JWT authentication, profile management, and a task catalogue with user selections. The mobile app communicates over HTTP/JSON, stores the JWT in the device's secure keychain, and manages auth state via React Context.

```
┌──────────────────────────────────────────────────────┐
│                   Mobile App (Expo)                   │
│  React Native · TypeScript · React Navigation        │
│  Axios client → JWT in SecureStore                   │
│  Runtime-configurable backend URL (AsyncStorage)     │
└────────────────────┬─────────────────────────────────┘
                     │  HTTP/JSON (REST)
                     ▼
┌──────────────────────────────────────────────────────┐
│               Backend API (Express)                   │
│  TypeScript · Zod validation · bcrypt · JWT signing   │
│  Nodemailer → Mailpit (dev) / real SMTP (prod)       │
└────────────────────┬─────────────────────────────────┘
                     │  Prisma ORM
                     ▼
┌──────────────────────────────────────────────────────┐
│              PostgreSQL 16 (Docker)                    │
│  Tables: users, otps, tasks, user_tasks              │
└──────────────────────────────────────────────────────┘
```

## Key Design Decisions

**OTP hashed, not stored in plaintext.** OTP codes are SHA-256 hashed before storage. If the database is compromised, the attacker can't extract valid codes. SHA-256 (not bcrypt) because OTPs are short-lived (10 min) and we need fast comparison — bcrypt's deliberate slowness isn't needed for ephemeral 6-digit codes.

**JWT over sessions.** Stateless auth is simpler for a mobile client: no server-side session store, no cookie management. The trade-off is that tokens can't be individually revoked (only expiry or secret rotation), which is acceptable at this scale. A refresh token rotation would be the next step for production.

**Business Name is optional.** The assignment mentions local businesses, but many users are ordinary households. Making it required would force non-business users to enter a dummy value. A nullable field is more honest.

**SecureStore (with generous timeout) over AsyncStorage for the JWT.** SecureStore uses the OS keychain/keystore for encryption at rest. AsyncStorage is plain-text JSON on disk. The trade-off: SecureStore can be slow on first access in Expo Go on Android (the Android Keystore needs time to initialise), so we race against a 15-second timeout and have a 20-second safety fallback. For a production build (not Expo Go), SecureStore is consistently fast.

**Runtime-configurable backend URL.** Hardcoding `localhost` works only for the developer's own machine. A reviewer on a different network would need to edit source code and rebuild. The in-app "Backend Setup" screen (first launch) and settings gear (later) let anyone point the app at any backend instance without touching code.

**Cleartext HTTP explicitly allowed in the Android build.** Android 9+ blocks plain HTTP (non-HTTPS) traffic by default in release builds, while Expo Go's development client allows it. Since the backend runs on plain HTTP for local development (expected for the assignment), the standalone APK sets `android.usesCleartextTraffic: true` in `app.json` so requests to `http://<LAN_IP>:3000` aren't silently dropped. A production deployment would use HTTPS and remove this setting.

**React Context over Redux/Zustand for auth state.** The auth state is small (token, user, loading flag, user name) and consumed by few components (navigator, login, home). React Context + `useReducer` handles this cleanly. Redux or Zustand would add dependencies and boilerplate for no benefit at this complexity level.

## What I Left Out (and Why)

- **Push notifications** — not in scope; the assignment focuses on the registration/profile/task-selection flow.
- **Offline support** — the app requires network connectivity for all operations. Caching or offline-first sync (e.g. WatermelonDB) would add significant complexity with minimal benefit for this use case.
- **Automated mobile UI tests** — manual end-to-end testing on a real Android device was sufficient for the assignment's scope. Detox or Maestro would be the next step.
- **CI/CD pipeline** — no GitHub Actions or similar. Tests run locally. A CI pipeline would be added for a real team project.
- **Rate limiting on auth endpoints** — the OTP system has built-in rate limiting (max attempts, resend cooldown), but the HTTP layer itself has no IP-based rate limiter. In production, this would sit behind a reverse proxy (nginx, Cloudflare) with rate limiting configured there.

## What I'd Do Next (With Another Week)

1. **Automated E2E tests with Detox** — cover the full flow (register → OTP → login → profile → tasks → home) in CI, not just manual testing.
2. **Refresh token rotation** — short-lived access tokens (15 min) + a long-lived refresh token stored in SecureStore, with token rotation on each refresh to limit the blast radius of a stolen token.
3. **CI pipeline (GitHub Actions)** — run backend tests, lint, and type-check on every PR. Build the APK nightly.
4. **Production email provider** — swap Mailpit for AWS SES or Resend, add email templating (MJML), and implement email delivery status tracking.
5. **Rate limiting + request logging** — add express-rate-limit to auth endpoints, structured logging with pino, and request-id tracing for debugging.
