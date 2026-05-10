# Book A Trike Backend API

This folder contains a modular Express API for the Book A Trike app.

## Stack

- Express for routing
- MySQL with mysql2/promise connection pooling
- Zod for request validation
- JWT for authentication
- bcryptjs for password hashing
- Helmet, CORS, request size limits, and rate limiting for hardening
- sanitize-html plus parameterized queries to reduce script injection and SQL injection risk

## Structure

- `index.js`: server entry point
- `src/app.js`: middleware and route bootstrap
- `src/config`: environment and database pool
- `src/modules`: feature-based CRUD modules
- `src/modules/<feature>/<feature>.routes.js`: HTTP endpoints
- `src/modules/<feature>/<feature>.controller.js`: request-response handling
- `src/modules/<feature>/<feature>.service.js`: database access and feature logic
- `src/modules/<feature>/<feature>.validation.js`: Zod validators
- `src/middlewares`: auth, validation, and error handling

## Environment

The backend now includes ready-made env files:

- `.env`: default local runtime file
- `.env.development`: local development template using offline MySQL
- `.env.production`: production template using online MySQL
- `.env.example`: full reference template

Required values:

- `JWT_SECRET`: use a long random string, at least 32 characters
- `DB_MODE`: `offline` or `online`
- Offline MySQL: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Online MySQL: `ONLINE_DB_HOST`, `ONLINE_DB_PORT`, `ONLINE_DB_USER`, `ONLINE_DB_PASSWORD`, `ONLINE_DB_NAME`
- Firebase Realtime Database or Admin SDK values if backend Firebase access is needed
- `FIREBASE_HEALTHCHECK_MODE`: `passive` by default to avoid noisy startup probes, or `probe` to perform a live Realtime Database connectivity check
- Twilio values if SMS or OTP is enabled
- Stream Chat values if chat token generation or chat webhooks are added
- PayMongo values if online checkout is enabled:
  - `PAYMONGO_SECRET_KEY`
  - `PAYMONGO_SUCCESS_URL`
  - `PAYMONGO_CANCEL_URL`

Firebase defaults were aligned with the current Flutter config for project, auth domain, database URL, storage bucket, and sender ID.

## Install and Run

```bash
cd lib/backend
npm install
npm start
```

The API defaults to `http://localhost:4000/api/v1`.

## Main Routes

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `GET /users`
- `POST /users`
- `GET /users/:userId`
- `PUT /users/:userId`
- `PATCH /users/:userId`
- `DELETE /users/:userId`
- `GET /chat/token`
- `POST /chat/channels/support`
- `POST /chat/channels/booking`
- `GET /chat/channels/booking/:bookingId`
- `GET /notifications/summary`
- `GET /notifications/connections`
- `POST /notifications/send`
- `GET /bookings`
- `POST /bookings`
- `GET /bookings/:bookingId`
- `PATCH /bookings/:bookingId`
- `DELETE /bookings/:bookingId`
- `GET /drivers`
- `POST /drivers`
- `GET /drivers/:driverId`
- `PUT /drivers/:driverId`
- `PATCH /drivers/:driverId`
- `GET /drivers/:driverId/trikes`
- `POST /drivers/:driverId/trikes`
- `GET /drivers/:driverId/trikes/:trikeId`
- `PUT /drivers/:driverId/trikes/:trikeId`
- `PATCH /drivers/:driverId/trikes/:trikeId`
- `DELETE /drivers/:driverId/trikes/:trikeId`
- `DELETE /drivers/:driverId`
- `GET /payments`
- `POST /payments/paymongo/checkout`
- `POST /payments`
- `GET /payments/:paymentId`
- `PATCH /payments/:paymentId`
- `DELETE /payments/:paymentId`
- `GET /violations`
- `GET /violations/types`
- `POST /violations/types`
- `GET /violations/types/:violationTypeId`
- `PUT /violations/types/:violationTypeId`
- `PATCH /violations/types/:violationTypeId`
- `DELETE /violations/types/:violationTypeId`
- `POST /violations`
- `GET /violations/:violationId`
- `PUT /violations/:violationId`
- `PATCH /violations/:violationId`
- `DELETE /violations/:violationId`

Each CRUD module now keeps its route, validation, controller, and service logic together so the backend is easier to navigate by feature instead of by framework layer.

CRUD rule in this backend:

- `POST /resource` creates a resource
- `GET /resource` and `GET /resource/:id` read resources
- `PUT /resource/:id` replaces the full profile or resource shape when the client sends the complete representation
- `PATCH /resource/:id` partially updates a resource
- `DELETE /resource/:id` removes a resource

User update rule:

- `PUT /users/:userId` replaces the full user profile payload: `fullName`, `contactNumber`, `email`, `username`, and optional `picFilePath`
- `PATCH /users/:userId` updates only the fields you send, and admins can also patch `role` and `disabled`

If your database already exists and you want to save profile pictures from the profile screen, run:

```sql
ALTER TABLE users ADD COLUMN picfilepath LONGTEXT NULL AFTER username;
```

Driver and fleet rule:

- `drivers` is the single route tree for driver profile data and that driver's trikes
- one driver can now own many trikes through `trikes.driverid`

Violation rule:

- `violations` is the single route tree for both violation records and violation types
- use `/violations/types` for violation type CRUD

## Performance Notes

- The SQL schema now includes additional composite indexes for bookings, users, payments, drivers, violations, and trikes to support 10k+ row datasets more efficiently.
- The main multi-step write flows now use database transactions so user creation, driver profile creation, trike assignment, and driver cleanup either fully commit or fully roll back.
- If you already have a live database, apply the new indexes and the `trikes.driverid` column change before using the latest backend code.

## Chat Notes

Stream Chat is exposed through the `chat` module.

- `GET /chat/token`: issue a Stream token for the currently authenticated backend user
- `POST /chat/channels/support`: create or return the current user's support chat channel
- `POST /chat/channels/booking`: create or return the booking chat channel for a booking with both passenger and driver assigned
- `GET /chat/channels/booking/:bookingId`: fetch an existing booking chat channel

HTTP method rule for this backend:

- Use `POST` to create a chat channel or issue a token
- Use `GET` to read chat state
- Use `PATCH` only for partial updates later, such as renaming a channel or updating channel metadata
- Use `PUT` only if you want to replace the full resource representation, which is not how the current chat flow works

## Firebase Presence And FCM

Firebase Realtime Database and FCM are now expected to work together like this:

- Flutter signs into Firebase Auth with a backend-issued custom token from `GET /users/me/firebase-token`
- Flutter writes presence to `presence/<role>/<userId>`
- Flutter drivers publish live GPS to `driver_locations/<userId>`
- Flutter stores FCM device tokens in `notification_tokens/<userId>/<tokenKey>`
- Backend reads those paths with Firebase Admin for monitoring and push delivery

Before presence, driver tracking, or FCM token registration can work from the app, deploy the Realtime Database rules in `database.rules.json`:

```bash
firebase deploy --only database
```

Admin-only notification routes:

- `GET /notifications/summary`: count online users, active driver locations, and registered notification devices
- `GET /notifications/connections`: inspect the current raw presence and driver-location payloads from Realtime Database
- `POST /notifications/send`: send an FCM notification to one or more app user IDs

Automatic booking push events:

- booking creation triggers `booking_created`
- driver assignment triggers `driver_assigned`
- booking status changes trigger `booking_status_changed`

These notification sends are best-effort. Booking create and update requests will still succeed if Firebase Admin is not configured or push delivery fails.

Example send payload:

```json
{
  "userIds": [12, 18],
  "title": "Driver Assigned",
  "body": "Your trike driver is on the way.",
  "data": {
    "type": "driver_assigned",
    "bookingId": "44"
  }
}
```

To enable backend FCM sending, place a Firebase service-account JSON file inside `lib/backend` or another safe path and set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`.

Local development note:

- `npm start` now uses a passive Firebase Admin status check by default, so it will report `configured` without forcing an outbound OAuth token fetch.
- If you want `/health/dependencies` and startup logs to prove live Firebase Realtime Database connectivity, set `FIREBASE_HEALTHCHECK_MODE=probe`.

## Database Note

The secure backend expects hashed passwords. For fresh imports, `database/bookatrike.sql` already updates `users.password` to `varchar(255)` and adds unique indexes on `email` and `username`.

If your database already exists, run this before using registration or login:

```sql
ALTER TABLE users
  MODIFY password VARCHAR(255) NOT NULL,
  MODIFY disabled BIT(1) NOT NULL DEFAULT b'0';

CREATE UNIQUE INDEX uq_users_email ON users(email);
CREATE UNIQUE INDEX uq_users_username ON users(username);
CREATE INDEX idx_user_disabled ON users(disabled);
```