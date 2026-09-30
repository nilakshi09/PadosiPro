# PadosiPro

A full-stack neighbourhood task-sharing platform where local service professionals register, verify their email via OTP, set up a profile, and select the services they offer — all from a polished React Native mobile app backed by a robust Node.js API.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v18+ (tested on v22) | [nodejs.org](https://nodejs.org/) |
| **Docker Desktop** | Latest | Runs PostgreSQL and Mailpit |
| **Expo Go** | Latest | Install on your Android phone from the Play Store |

---

## Backend Setup

Run these commands **in order** from the project root:

```bash
# 1. Start PostgreSQL and Mailpit
docker compose up -d

# 2. Install backend dependencies
cd backend
npm install

# 3. Create your .env from the example (pre-filled for local dev)
cp .env.example .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed the task catalogue (23 tasks across 5 categories)
npm run prisma:seed

# 6. Start the dev server (hot-reload via tsx)
npm run dev
```

The backend is now running at **http://localhost:3000**. Verify with:

```bash
curl http://localhost:3000/api/health
```

---

## Environment Variables

All configuration is in `backend/.env`. A ready-to-use template is provided:

```bash
cp backend/.env.example backend/.env
```

The `.env.example` file contains **only placeholder values** (e.g. `replace-with-a-long-random-string` for `JWT_SECRET`). No real secrets are committed anywhere in the repository — `.env` is gitignored at both the root and backend level.

Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Backend server port |
| `DATABASE_URL` | `postgresql://padosi:padosi_local@localhost:5433/padosipro` | Postgres connection (matches docker-compose) |
| `JWT_SECRET` | *(placeholder)* | Secret for signing JWTs — change this |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Mailpit SMTP (see below) |
| `OTP_TTL_MINUTES` | `10` | OTP validity window |

---

## Mailpit (Local Email)

We use **[Mailpit](https://github.com/axllent/mailpit)** as a local SMTP catch-all server, as the assignment explicitly allows. Every email the backend sends (OTP verification codes) is captured by Mailpit instead of going to a real inbox.

**View captured emails:** [http://localhost:8025](http://localhost:8025)

Mailpit starts automatically with `docker compose up -d` — no extra setup needed.

**For production:** Replace `SMTP_HOST` and `SMTP_PORT` in `.env` with a real SMTP provider (e.g. AWS SES, SendGrid, Resend) and add any required authentication credentials (`SMTP_USER`, `SMTP_PASS`).

---

## Running the Backend Tests

```bash
cd backend
npm test
```

All **49 tests** across 3 test suites pass:

- `auth.test.ts` — Registration, login, input validation
- `otp.test.ts` — OTP generation, verification, expiry, rate limiting
- `profile-and-tasks.test.ts` — Profile CRUD, task catalogue, task selection

Tests use an isolated test database (auto-created by the test setup) and clean up after themselves.

---

## Mobile App Setup

```bash
# 1. Install dependencies (from the mobile directory)
cd mobile
npm install

# 2. Start the Expo dev server
npx expo start
```

Then open **Expo Go** on your Android phone and scan the QR code shown in the terminal.

---

## Runtime Backend URL Configuration

The mobile app does **not** hardcode the backend URL. Instead, it provides a runtime configuration screen so reviewers can point the app at their own backend without rebuilding.

### First Launch

On first launch, a **"Backend Setup"** screen appears before the auth flow. Enter your backend's URL and tap **Save & Continue**. The URL is persisted in AsyncStorage and used for all subsequent API calls.

### Which URL to Use

| Running on | Backend URL to enter | Why |
|---|---|---|
| **Android Emulator** | `http://10.0.2.2:3000` | `10.0.2.2` is the emulator's alias for the host machine's `localhost` |
| **Physical device (same Wi-Fi)** | `http://<YOUR_LOCAL_IP>:3000` | Your computer's LAN IP — see below |

### Finding Your Local IP

- **Windows:** Open a terminal and run `ipconfig`. Look for **"Wireless LAN adapter Wi-Fi"** → **"IPv4 Address"** (e.g. `192.168.1.42`).
- **Mac/Linux:** Run `ifconfig` or `ip addr`. Look for your Wi-Fi interface's `inet` address.

Your phone and computer **must be on the same Wi-Fi network**.

### Changing the URL Later

Tap the **⚙ settings gear icon** in the top-right corner of the **Home** screen to re-open the Backend URL modal at any time.

---

## Building the APK

### Building the APK

> **See below** — the exact EAS Build commands will be added after the first successful build.

---

## Available Scripts

### Backend (`backend/`)

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Start with hot-reload (`tsx watch`) |
| Build | `npm run build` | Compile TypeScript to `dist/` |
| Start | `npm start` | Run compiled JS (`node dist/server.js`) |
| Test | `npm test` | Run all tests with Vitest |
| Test (watch) | `npm run test:watch` | Run tests in watch mode |
| Migrate | `npm run prisma:migrate` | Run Prisma migrations |
| Seed | `npm run prisma:seed` | Seed the task catalogue |

### Mobile (`mobile/`)

| Script | Command | Description |
|---|---|---|
| Start | `npm start` | Start Expo dev server |
| Android | `npm run android` | Start with Android target |
| iOS | `npm run ios` | Start with iOS target |
| Web | `npm run web` | Start with web target |

---

## Project Structure

```
PadosiPro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database models (User, Otp, Task, UserTask)
│   │   ├── seed.ts             # Task catalogue seeder (23 tasks, 5 categories)
│   │   └── migrations/         # Version-controlled DB migrations
│   └── src/
│       ├── config/             # Environment & configuration
│       ├── middleware/         # Auth, validation, error handling
│       ├── routes/            # Route definitions
│       ├── services/          # Business logic (auth, OTP, profile, tasks)
│       ├── utils/             # Shared helpers
│       └── tests/             # Vitest test suites (49 tests)
├── mobile/
│   └── src/
│       ├── api/               # Axios client, auth/profile/tasks API, backend URL config
│       ├── components/        # Reusable UI (Button, TextField, BackendUrlModal, etc.)
│       ├── context/           # AuthContext (React Context for auth state)
│       ├── navigation/        # RootNavigator with auth/app stack switching
│       ├── screens/
│       │   ├── auth/          # Register, VerifyOtp, Login
│       │   └── app/           # ProfileSetup, TaskSelection, Home
│       ├── theme/             # Design system (colors, typography, spacing)
│       └── types/             # TypeScript type definitions
├── docker-compose.yml          # PostgreSQL + Mailpit
└── .gitignore
```

---

## Known Limitations

- **Business Name is optional** — not every household runs a business, so the profile form treats it as a nullable field rather than requiring it.
- **Task search is server-side with 300ms debounce** — slight latency on search, but avoids downloading the full catalogue upfront and allows the backend to search across multiple fields.
- **SecureStore read timeout is 15 seconds** — generous to accommodate the Android Keystore, which can be slow on first access after boot in Expo Go on some physical devices. A 20-second safety-net timeout ensures the app always finishes loading.
- **No refresh token flow** — JWTs are long-lived (7 days). A proper refresh token rotation would be added for production.
- **Session-expired auto-logout** — when the backend returns 401 on any request, the global axios interceptor triggers a signOut and shows a "session expired" message on the login screen. This is a good UX but means a single bad response logs the user out.
- **Backend URL stored in AsyncStorage (not SecureStore)** — this is intentional: the URL is not a secret and AsyncStorage is more reliable across Expo Go environments.
- **Cleartext HTTP allowed in Android build** — the standalone APK has `usesCleartextTraffic: true` set so it can reach a local backend running on plain HTTP (no HTTPS). This is intentional for local-network testing per the assignment requirements. A real production deployment would use HTTPS and this setting would be removed.
