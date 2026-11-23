# Production-Grade Node.js + TypeScript + SQL Backend

An interview-ready backend architecture adhering to enterprise standards, Clean Layered Architecture, and modern TypeScript best practices.

---

## 🏛️ Architectural Overview

This backend is organized using **Clean Layered Architecture (Separation of Concerns)**:

```
backend-node/
├── prisma/
│   ├── schema.prisma            # Database schema & relations (MySQL)
│   └── seed.ts                  # Database seeding script (Admin & Demo users)
├── src/
│   ├── config/                  # Environment validation & DB connection singleton
│   │   ├── env.ts               # Type-safe environment variables parsed with Zod
│   │   └── db.ts                # PrismaClient singleton with graceful lifecycle
│   ├── constants/               # HTTP status codes & standard response messages
│   ├── middlewares/             # Cross-cutting concerns
│   │   ├── auth.middleware.ts   # JWT authentication & Role-Based Access Control (RBAC)
│   │   ├── validate.middleware.ts # Zod schema validator (body, query, params)
│   │   ├── errorHandler.middleware.ts # Centralized error handler (Prisma, Zod, ApiError)
│   │   ├── rateLimiter.middleware.ts  # Express rate limiting
│   │   └── notFound.middleware.ts     # 404 handler
│   ├── modules/                 # Feature-based clean architecture modules
│   │   ├── auth/                # Authentication & Token Rotation (JWT + Refresh Tokens)
│   │   ├── user/                # User profile & Admin user management
│   │   ├── item/                # Full CRUD, Search, Pagination, Filtering, Ownership rules
│   │   └── health/              # System health, DB ping, uptime & memory metrics
│   ├── types/                   # Express augmentations, auth & pagination types
│   ├── utils/                   # Standardized ApiError, ApiResponse envelope, JWT & Bcrypt
│   ├── app.ts                   # Express application setup & middleware pipeline
│   └── server.ts                # Server bootstrap & graceful shutdown (SIGTERM/SIGINT)
├── .env                         # Local environment configuration
├── .env.example                 # Template environment variables
├── package.json
└── tsconfig.json
```

---

## 🚀 Key Architectural & Interview Highlights

1. **Clean Layered Architecture**:
   - **Routes**: Handle routing, URL parameters, and apply middlewares.
   - **Controllers**: Parse HTTP requests, delegate to services, and format standardized responses (`ApiResponse`).
   - **Services**: Pure business logic (ownership checks, password hashing, token generation), decoupled from Express.
   - **Repositories**: Data access layer encapsulating Prisma queries.

2. **Security & Production Hardening**:
   - **Helmet**: Adds secure HTTP headers.
   - **CORS**: Configurable allowed origin whitelist.
   - **Rate Limiting**: Protects against brute-force and DoS attacks.
   - **Password Hashing**: `bcryptjs` with salt rounds.
   - **Token Rotation**: Short-lived Access Tokens (15m) + revocable Refresh Tokens (7d) stored in SQL database.
   - **Role-Based Access Control (RBAC)**: Support for `USER` and `ADMIN` roles.

3. **Fail-Fast Environment Validation**:
   - Configuration is validated at boot time with `Zod`. The app will crash with an informative error if mandatory variables are missing.

4. **Centralized Error Handling**:
   - Standardized `ApiError` hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`).
   - Maps Prisma error codes (e.g., `P2002` duplicate key, `P2025` record not found) to HTTP status codes.
   - Formats Zod validation issues cleanly.

5. **Graceful Shutdown**:
   - Listens to `SIGTERM` and `SIGINT` signals, drains in-flight requests, and cleanly disconnects Prisma before exiting.

---

## ⚙️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (already created with default MySQL port `3306`):
```bash
DATABASE_URL="mysql://root:1234@localhost:3306/node_app_db"
PORT=5001
```

### 3. Sync Database & Seed Data
```bash
# Push schema to MySQL database
npm run db:push

# Seed default Admin and User accounts
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5001`.

---

## 🔑 Default Seed Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Admin@12345` |
| **User** | `user@example.com` | `User@12345` |

---

## 📡 API Reference

### Health
- `GET /api/health` - Check service uptime, memory metrics, and MySQL database connection.

### Authentication (`/api/v1/auth`)
- `POST /register` - Register a new user (`email`, `password`, `name`).
- `POST /login` - Login (`email`, `password`) -> Returns `accessToken` + `refreshToken`.
- `POST /refresh` - Rotate tokens with `{ "refreshToken": "..." }`.
- `POST /logout` - Revoke refresh token.
- `GET /me` - Get profile of authenticated user (`Authorization: Bearer <token>`).

### Users (`/api/v1/users`)
- `GET /me` - Current user profile.
- `PATCH /me` - Update profile (`name`, `email`).
- `GET /` - Paginated list of users (**ADMIN only**).
- `PATCH /:id/role` - Update user role (**ADMIN only**).

### Items (`/api/v1/items`)
- `GET /` - Paginated search and filter list:
  - Query params: `page`, `limit`, `search`, `status` (`ACTIVE`/`INACTIVE`/`ARCHIVED`), `sortBy`, `sortOrder`.
- `GET /:id` - Get item by ID.
- `POST /` - Create item (Requires Auth).
- `PATCH /:id` - Update item (Owner or Admin).
- `DELETE /:id` - Delete item (Owner or Admin).

---

## 🛠️ How to Add a New Feature / Service

Follow these 4 steps to keep the architecture clean and consistent:

1. **Model & Schema**:
   - Add model to `prisma/schema.prisma`.
   - Run `npx prisma db push` (or `npx prisma migrate dev`).
2. **Module Directory**:
   - Create `src/modules/<feature_name>/`
   - `<feature>.validation.ts` (Zod schemas for body, query, params)
   - `<feature>.repository.ts` (Prisma queries)
   - `<feature>.service.ts` (Business logic)
   - `<feature>.controller.ts` (Express req/res handling)
   - `<feature>.routes.ts` (Router setup)
3. **Register Route**:
   - Mount your router in `src/app.ts`: `app.use('/api/v1/<feature>', <feature>Routes);`

## Stripe Connect payments

The Payments dashboard at `/payments` supports receiver onboarding, payment requests, hosted Checkout,
participant-only history, and success/failure slips. This implementation routes payments to individual
Stripe Express connected accounts using destination charges and `on_behalf_of`.

### Configuration and local setup

Enable Connect in your Stripe sandbox/test account. In `backend-node/.env`, configure:

```dotenv
APP_BASE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_ENDPOINT_SECRET
STRIPE_ALLOW_LIVE=false
```

Keep these credentials on the backend. Hosted Checkout does not require a publishable key in the frontend.
Restart the backend after changing environment variables. Missing credentials disable the payment UI without
preventing other application modules from starting. Live keys/events are blocked unless explicitly enabled.

From `backend-node`, validate and generate the client using the schema folder:

```powershell
npx.cmd prisma validate --schema=./prisma/schema
npm.cmd run db:generate -- --schema=./prisma/schema
```

The configured test database has been updated. For another existing database, review its schema diff before
applying changes; establish a migration baseline before adopting Prisma Migrate. Do not reset a populated database.

Install and authenticate the Stripe CLI, then forward **platform-account** events to the local webhook:

```powershell
stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,checkout.session.expired,checkout.session.completed --forward-to http://localhost:5001/api/v1/webhooks/stripe
```

Copy the listener's signing secret into `STRIPE_WEBHOOK_SECRET` and restart the backend. For hosted environments,
register the equivalent HTTPS endpoint in Stripe and use that endpoint's secret. Configure its snapshot event API
version to match the installed Stripe SDK (currently `2026-11-18.endive`). Destination-charge PaymentIntent events
belong to the platform account; the server verifies their destination against the saved receiver account.

### User flow

1. A receiver signs in, opens Payments, and completes Stripe Connect onboarding. Stripe determines country,
   currency, verification, and payout availability. The account must have charges and payouts enabled and its
   transfers capability active before it can receive payment requests.
2. The receiver selects a payer and creates a request with an amount, currency, and description. The authenticated
   receiver and their saved connected account are used; the browser cannot choose an arbitrary destination account.
3. The payer signs in, opens the request, and chooses **Pay securely with Stripe**. Checkout reads the amount and
   currency from the database. The supported currencies are USD, INR, EUR, and GBP, with two decimal places.
4. Stripe reports the result through a signed webhook. Returning to the application does not confirm or cancel a payment.
   Checkout cancellation leaves the request available while its session is open; an expired session closes the request.
5. Every confirmed failed charge attempt keeps a separate failed slip. A later success keeps the failure history and
   becomes the payment's current receipt. Duplicate webhook events or success notifications do not create extra receipts.

### Endpoints

Payment endpoints require authentication. Lists and details are restricted to the sender/receiver.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/payments` | Paginated payment history |
| GET | `/api/v1/payments/people?search=...` | Find an active payer |
| GET | `/api/v1/payments/connect` | Current user's Connect readiness |
| POST | `/api/v1/payments/connect/onboarding` | Create/resume onboarding (`country` required for a new account) |
| POST | `/api/v1/payments` | Request payment (`senderId`, decimal-string `amount`, `currency`, `description`) |
| POST | `/api/v1/payments/checkout` | Open/reuse Checkout (`paymentId` only) |
| GET | `/api/v1/payments/:id` | Payment, attempts, and receipt status |
| GET | `/api/v1/payments/:id/receipts/:receiptId` | Private receipt download |
| POST | `/api/v1/payments/:id/receipts/:receiptId/retry` | Retry exhausted receipt generation |
| POST | `/api/v1/webhooks/stripe` | Stripe-signed webhook; raw body, no browser authentication |

For authenticated POSTs, first obtain `/api/v1/auth/csrf`, then send its returned token as `X-CSRF-Token` with the
cookies. The frontend's `paymentPost()` helper does this and retries once if a session refresh rotated the token.
Payment routes have per-user read/mutation rate limits; Stripe webhooks are mounted before JSON parsing and browser limits.

### Receipt durability

The webhook commits the payment result, deduplication event, immutable receipt snapshot, attempt, and receipt job in
one database transaction before acknowledging Stripe. A database-backed worker runs every five seconds, leases jobs,
recovers expired leases, and retries generation up to five times. It does not depend on Redis.

Receipts are self-contained printable HTML documents stored privately in `PaymentGeneration.documentHtml` and served
through the authenticated download endpoint. `fileKey` identifies the stored document. User content is HTML-escaped.
The worker never changes a payment's financial outcome. Open a downloaded document and use Print to save as PDF.
Failed slips explicitly state that they are not proof of a completed payment. Refunds and disputes are separate future flows.

### Verification

```powershell
npm.cmd test
# Optional real-database invariant test: inserts are deliberately rolled back.
$env:RUN_PAYMENT_DB_TESTS = 'true'
npm.cmd test -- src/tests/payment-database.test.ts
Remove-Item Env:RUN_PAYMENT_DB_TESTS
```

The automated tests cover signed raw webhooks, amount/destination matching, idempotency, access rules, failed-to-successful
history, receipt escaping, worker claims, and retry scheduling. To test actual hosted payment collection, complete two-user
onboarding/Checkout in your Stripe sandbox using Stripe test payment methods; no real card data belongs in this application.
