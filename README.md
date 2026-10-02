# Smart Residential Mobile

Smart Residential Mobile is a React Native application for residents, staff, and administrators of the Prime City residential community. It brings billing, announcements, visitor pre-registration, helper requests, issue reporting, emergency alerts, realtime notifications, profile management, and a privacy-aware AI assistant into one mobile experience.

This repository contains the Android and iOS client. The Node.js, Express, MongoDB, and Socket.IO backend is maintained in a separate `prime_city_be/Node_Backend` project and must be deployed for connected features to work.

## Features

- Two-step email/password and OTP sign-in
- OTP-based forgot-password flow
- Access-token refresh and automatic session expiry handling
- Resident dashboard with advertisements, announcements, and quick actions
- Role-scoped billing: residents see only their room's bills; Admin and Staff can see resident bills
- Visitor pre-registration with a signed one-time QR gate pass, the preserved walk-in form flow, and resident visitor history
- Quick Action parking availability with separate Resident and Visitor slot cards
- Available-helper directory, category pricing, helper requests, and resident helper history
- Resident My Wallet with RFID identity, approved Prime City shop payments, private receipts, and Admin merchant settlement ledger
- Resident-child playground offers, registration, RFID-wallet payment, and Admin booking review
- Maintenance, security, and general issue reports with resident status history
- Security, medical, and fire SOS alerts
- Database-backed notification inbox with per-user unread counts and mark-as-read support
- JWT-authenticated Socket.IO realtime notification updates with reconnect support
- Firebase Cloud Messaging push notifications with Android notification channels
- Admin-only notification composer for one selected resident or all residents
- Admin acknowledgement/submit actions for resident reports and helper requests, with resident notification
- Admin request/report detail views with resident and room information
- Resident profile photo upload, read-only account details, Settings access, and light/dark theme switching
- Floating AI assistant with text chat, voice input/output, private chat history, role-scoped tools, RAG, feedback, and consistent Myanmar honorifics

## Version 2 Updates

The Version 2 update preserves the existing navigation and resident features while extending the connected data, privacy, and administration behavior.

### Role and UI corrections

- Admin and Staff accounts are labelled with their actual role instead of appearing as residents.
- The `Report Now` action is hidden for Admin and Staff, while the resident reporting feature remains available.
- Opening helper, visitor, alert, or history screens no longer changes the Announcement tab into a false `New` state.
- The notification bell uses the real unread count. Its red indicator is shown only while unread notifications exist.
- Application registration now happens synchronously on cold start. Icon-font loading cannot delay React Native registration and cause the first launch to close before the UI appears.

### Bills and resident activity

- Bill data comes from the backend instead of local sample records. Admin/Staff can create category bills for one selected resident or all occupied resident rooms; duplicate room/month/category bills are skipped safely.
- The backend automatically checks the current `Asia/Yangon` billing month at startup and every six hours. Missing Apartment Installment and Service Fee bills are created separately only for Occupied rooms, and assigning a resident through room management or signup triggers the same idempotent check immediately.
- Apartment installment, electricity, water, maintenance, service fee, and other charges are independent bills. A resident can pay one category without paying or changing another category.
- Each non-zero category has its own Admin-selected due date, server-calculated authoritative amount, status, screenshot submission, and payment history. Electricity and water display their category-specific overdue service warning.
- After a due date passes, an unpaid resident sees a red warning on Home until Admin approval changes every overdue bill to `Paid`; tapping the warning opens Bills.
- Room purchase plans use authoritative room-type prices: Business `500,000,000 MMK`, Office `1,000,000,000 MMK`, Standard `200,000,000 MMK`, and Premium `300,000,000 MMK`. The recorded 40% down payment leaves 60% payable over 60 monthly installments.
- Resident bill queries are derived from the authenticated user and assigned room; a client-provided user or room ID cannot expand access.
- Admin and Staff receive the authorized cross-resident bill view.
- Tapping a bill opens a detail popup with its fee category, exact category amount, due date, status, and relevant breakdown.
- Resident `Pay Now` shows the exact amount and KPay phone number `09965139303`, with copy actions and manual-open instructions. The app does not invent or use an unverified KPay deep link.
- Residents can upload a JPEG, PNG, or WebP KPay screenshot up to 5 MB. New screenshots are stored privately in MongoDB GridFS and are readable only through an authenticated, ownership-checked endpoint. Android Admin review downloads the authorized proof into the app-private cache for reliable display and removes that temporary file as soon as the review modal closes.
- Uploading a screenshot changes the bill to `Payment Submitted`; it never marks the bill Paid. Admin/Staff can mark it Under Review, approve it, reject it, or request resubmission.
- Approval atomically finalizes the active submission and changes the bill to `Paid`. Rejected submissions become inactive so the resident can submit a corrected screenshot.
- Payment approval/rejection and new category bills create resident notifications. Admin receives a database/realtime/push notification that identifies the submitting resident, room, fee category, and exact amount.
- The resident Activity History screen includes visitor registrations, requested helpers, submitted reports, and the signed-in resident's private KPay payment history.
- Payment History retains each submitted screenshot and shows its room, fee category, expected/submitted amount, submission date, review date, Paid date, Admin status, and rejection/resubmission note. Screenshots open through the authenticated owner-only proof endpoint and are never shared across residents.
- Report history includes status and acknowledgement information and remains available until the corresponding records are deleted.

### Announcement lifecycle

- Announcements are Admin/Staff managed; authenticated reads apply resident-specific audience filtering.
- Backward compatibility keeps the installed Version 1 client working: its tokenless read request can see only `Active` announcements addressed to `All Residents`. Authenticated Version 2 clients retain room/building/floor audience filtering, and all create, complete, archive, and delete operations remain Admin/Staff protected.
- Audience scope supports all residents, one building, one floor, or one room.
- Maintenance notices move through `Active`, `Completed`, and `Archived` states instead of remaining visible forever.
- Completing maintenance removes it from resident active lists and notifies affected residents once.
- Archiving/removing an active maintenance notice also sends the affected-resident completion/removal notification, while retaining an audit record.

### Notifications and admin workflow

- Admin can keep `All residents` selected for a community-wide send, or use `Select residents` to choose one or multiple residents from the searchable backend resident list. Selected IDs are de-duplicated and validated as resident accounts before any notification is created.
- A selected-recipient send creates one private MongoDB notification per chosen resident, emits realtime notification events only to those residents, and sends FCM to their registered devices. Invalid or missing selected accounts reject the whole request instead of producing a partial send.
- Notifications are persisted in MongoDB, delivered in-app through authenticated Socket.IO, and registered for Firebase device push.
- Android Firebase notifications appear in the system tray while the app is backgrounded or normally closed. Versioned high-importance channels provide the default system sound and vibration for community, helper, and urgent alerts, subject to the resident's Android notification settings.
- Profile Settings provides a direct link to Android notification settings so residents can enable permission, sound, and vibration. Lock-screen push visibility is private to reduce exposure of message content.
- Realtime socket identity is derived from the access token, not from a user ID supplied by the client.
- Admin can inspect the originating resident and room for supported requests and reports.
- Submitting a report, helper request, or actionable notification records the action and sends an acknowledgement notification back to the resident.
- Admin Helper Request cards provide a one-time `Submit & notify resident` action and show `Submitted` after acknowledgement.
- Multiple devices per user are supported, and notification socket authentication is refreshed on reconnect.

### Parking availability

- Home Quick Actions includes a `Parking Slots` card for Resident and Admin/Staff accounts.
- The Parking screen shows Resident Parking and Visitor Parking separately with available, occupied, maintenance, usable, and total slot counts from the backend.
- Parking changes emitted by the existing MQTT/backend flow update the screen through authenticated Socket.IO; pull-to-refresh and a 30-second fallback refresh remain available when realtime connectivity is interrupted.
- The mobile screen is read-only and does not expose parking setup, reset, or occupancy mutation controls.

### Helpers, RFID wallet, and playground

- Cleaning requests publish the fixed `30,000 MMK` price and `9:00 AM - 12:00 PM` service window. The backend saves that quote with the request so Resident history and Admin review display the same price.
- Helper categories without a supplied business price remain `Admin Confirmation`; the application does not invent fees for them.
- Resident Quick Actions includes `My Wallet`. The screen masks the RFID UID, shows card status and wallet balance, and lists only the authenticated resident's transactions and shop receipts.
- Admin/Staff Quick Actions includes `Wallet & Shops`, with resident credit, approved merchant creation, merchant balances, recent payment references, and externally settled amount recording. Only residents with an active RFID card can receive credit or make a wallet purchase.
- Residents can pay an exact whole-MMK amount only to an active Admin-approved Prime City merchant. Each purchase atomically debits the resident wallet, credits the merchant ledger, creates a unique receipt reference, and sends a private receipt notification.
- Wallet payment retries use an idempotency key, preventing the same request from charging twice. Residents cannot create merchants, settle merchant balances, view another resident's wallet, or access the Admin merchant ledger.
- Merchant settlements require Admin/Staff authorization and a real external bank/KPay reference. The ledger records settlement; it does not claim to move external bank funds automatically.
- RFID wallet credits can be recorded only by authenticated Admin/Staff. Balance changes, shop purchases, merchant settlements, and playground payments use immutable transaction records and Admin audit entries.
- Resident Quick Actions includes `Playground`, where a resident can register a child aged 1–17 for a future Morning, Afternoon, or Evening session and view their own registrations.
- Admin/Staff can review all playground registrations from the same Quick Action and set Confirmed, Waitlisted, Completed, or Cancelled. Status changes notify the resident.
- Playground pricing and the resident-child discount are environment-configured. If no official values are configured, registrations remain price-pending instead of displaying an invented fee.
- A configured paid playground session can be paid from the resident's active RFID wallet. The debit and registration are atomic; an Admin cancellation atomically creates a wallet refund transaction.

### Visitor gate QR flows

- The existing walk-in flow remains unchanged: the ESP32-CAM scans the configured static visitor badge, `/api/qr-scan` emits the existing `unlock` event, and the reception display shows the existing registration-form QR.
- An authenticated resident pre-registration now creates a visit-date-bound, one-time QR pass. The resident can display, save, or share it and can reopen an active pass from `My History`.
- Sharing includes a bearer-link web pass at `/visitor-pass#<signed-token>` so an Android visitor can open the QR without installing Prime City. The URL fragment is not sent in the initial page request; the page exchanges it for a minimal QR preview and never receives private visitor contact/identity fields.
- A pre-registration QR contains only a signed opaque token. It does not embed the visitor phone, email, NRIC, resident profile, or room data.
- When the ESP32-CAM sends that token to `/api/qr-scan`, the backend validates its HMAC signature, activation time, expiry, database record, and unused status. The pass is atomically marked `Used`, preventing a second gate entry with the same QR.
- A valid pre-registration scan emits `pre_registered_visitor` to the existing `/display` SSE page. The display shows only the approved visitor name, badge, host, room, and purpose for ten seconds, then returns to scanner mode.
- Public visitors without a pre-registration continue to scan the existing form QR and complete the original web form. No original visitor route or screen was removed.

### Profile settings

- A Settings button is displayed beside Sign out on the Profile screen.
- Authenticated users can select, upload, and replace their own profile photo from the device photo library.
- Profile upload accepts JPEG, PNG, or WebP images up to 5 MB through a dedicated authenticated endpoint.
- Name, email, phone, unit, role, and other account data remain read-only for residents; the profile endpoint only updates `profile_image`.
- Uploaded files use generated filenames and are served from the backend's ignored `public/uploads/profile-images` runtime directory.

### AI assistant, RAG, and privacy

- AI bill answers use only the authenticated resident's assigned room. Admin-only aggregate tools remain protected by role checks.
- Private tools for bills, visitor history, helper history, reports, SOS, and RFID activity are scoped to the signed-in user.
- The assistant can answer current resident-population, room-availability, date/time, configured Admin contact, and live weather questions through backend tools.
- Myanmar questions such as `Prime City မှာ အခန်း ဘယ်နှခန်းရှိလဲ` use the live room inventory tool and return total, occupied, available, and maintenance counts; no duplicate AI room-data implementation was added.
- Admin contact requests return `09455507081` and `09965139303`.
- Chat conversations are persisted per user, restored in paginated batches across app launches, and retained until that user deletes them.
- Relevant memory retrieval is restricted to the same user. One resident's chat, bill, or activity data is never included in another resident's context.
- The assistant preserves the user's selected Myanmar honorific style, such as `ရှင်` or `ခင်ဗျာ`, across the conversation.
- RAG retrieval uses audience/role filters, document metadata, query-relevant chunks, and source information.
- Positive and categorized negative feedback can be submitted from chat. Feedback is private by default and is never promoted automatically.
- Admin review APIs can approve or reject feedback. Approval requires separately reviewed knowledge text, creates an auditable knowledge record, and does not publish raw private chat content.
- The Admin Home quick actions now include `AI Feedback & RAG`. Admin/Staff can review pending, approved, and rejected feedback, manually write privacy-safe reusable knowledge, publish it to the existing RAG collection, inspect active/inactive knowledge, and deactivate a knowledge item without deleting its audit history.

### Backend security and observability

- Admin notification sends, request submissions, report changes, knowledge changes, and feedback reviews create sanitized audit records.
- Payment screenshots use generated GridFS identifiers, file-signature validation, authenticated delivery, and `private, no-store` response headers. The raw GridFS file identifier is never returned to the mobile client.
- Bill reads, payment submissions, payment history, and proof images enforce authenticated user/room ownership; Admin/Staff review routes are separately role protected.
- Submission creation and Admin approval use MongoDB transactions. Duplicate active submissions, wrong amounts, resubmission while under review, and double approval are rejected.
- Previously public room management routes now require Admin/Staff authentication. Public aggregate room availability remains available through the intentionally limited stats endpoint.
- Public signup always creates a Resident account; privileged roles can be assigned only through authenticated Admin APIs with schema role validation. OTP values and server stack traces are not returned or written to routine authentication logs.
- Frequently queried notification, bill, visitor, helper, report, device-token, knowledge, and feedback fields have database indexes.
- List/history endpoints use bounded limits or pagination to avoid unbounded responses.
- New schemas and indexes are additive; the update does not drop existing user or production data.

## Current Scope and Production Requirements

- The updated backend and V2 database migration must be deployed before the new payment and announcement lifecycle APIs are available from the production API URL.
- In-app database/socket delivery works with the backend. Background and terminated-app push delivery additionally requires a Firebase Admin service account on the backend.
- RAG currently uses MongoDB-backed metadata and relevant-chunk retrieval. A separate vector database or embedding provider is not required by this version and is not configured.
- Full account-field editing remains intentionally unavailable to residents; the photo-only Settings screen is active.
- Never place Firebase Admin credentials, database credentials, signing keys, or other server secrets in the mobile application.
- Set `PLAYGROUND_BASE_FEE_MMK` and `PLAYGROUND_RESIDENT_DISCOUNT_PERCENT` on the EC2 backend to publish the official playground rate and resident-child discount. Restart PM2 only after validating the values; neither value belongs in the mobile bundle.
- Set a random server-only `VISITOR_QR_SIGNING_SECRET` of at least 32 characters on EC2 before using pre-registration passes. Keep it stable across PM2 restarts, never place it in the app/QR payload/repository, and rotate it only when intentionally invalidating all outstanding passes. For compatibility with an older deployment, a configured shorter `JWT_SECRET` is converted into a purpose-specific 32-byte HMAC key; this prevents the registration failure seen on the previous server while a dedicated high-entropy visitor secret remains the production recommendation. Existing passes created with a 32+ character secret keep their original signature behavior.
- The backend creates the signed QR before saving a pre-registration, so a signing/configuration failure cannot leave a visitor record with no usable pass. Public API errors do not expose signing configuration details.

## Tech Stack

| Area | Technology |
| --- | --- |
| Mobile framework | React Native 0.85.3 |
| UI | React 19.2.3 |
| Navigation | React Navigation 7 |
| Local persistence | AsyncStorage |
| Realtime transport | Socket.IO client with JWT authentication |
| Push notifications | Firebase Cloud Messaging and Notifee |
| Profile photo picker | React Native Image Picker |
| Voice assistant | React Native Voice, TTS, Audio Recorder Player, and React Native FS |
| Icons | React Native Vector Icons / Ionicons |
| Android | Kotlin, Gradle, min SDK 24, target SDK 36 |
| iOS | Swift, CocoaPods |
| JavaScript engine | Hermes |
| Tests | Jest and React Test Renderer |

The React Native New Architecture is enabled for both platforms.

## Repository Structure

```text
smart_residential/
├── README.md
└── Smart_city_Mobile/
    ├── android/                 # Native Android project
    ├── ios/                     # Native iOS project
    ├── patches/                 # patch-package fixes for voice and TTS
    ├── scripts/                 # Icon linking/generation helpers
    ├── src/
    │   ├── api/                 # HTTP client and feature API modules
    │   ├── assets/              # App images
    │   ├── components/          # Shared UI and floating assistant
    │   ├── config/              # API configuration
    │   ├── context/             # Authentication, chat, notification, and theme state
    │   ├── hooks/               # Voice assistant behavior
    │   ├── navigation/          # Auth, stack, and tab navigators
    │   ├── screens/             # Feature screens
    │   └── services/            # Chat, realtime socket, and push-notification services
    ├── __tests__/               # Jest tests
    ├── App.jsx                  # Provider and application composition
    ├── index.js                 # Native entry point and background push setup
    └── package.json             # Dependencies and npm scripts
```

## Prerequisites

Install the React Native development tools for the platform you want to run:

- Node.js 22.11.0 or newer
- npm
- Watchman on macOS (recommended)
- JDK 17
- Android Studio, Android SDK 36, and an emulator or physical Android device
- macOS and Xcode for iOS development
- Ruby 2.6.10 or newer and CocoaPods 1.13 or newer for iOS

Make sure the Android SDK environment variables and platform tools are available to your shell. For full native setup guidance, see the [React Native environment setup documentation](https://reactnative.dev/docs/set-up-your-environment).

## Installation

From the repository root:

```bash
cd Smart_city_Mobile
npm ci
```

`npm ci` also runs the `postinstall` script, which links the Ionicons font and applies the patches stored in `patches/`.

For iOS, install the Ruby and CocoaPods dependencies:

```bash
bundle install
bundle exec pod install --project-directory=ios
```

Run the pod-install command again after changing native dependencies.

## Backend Configuration

The application currently reads its API base URL from:

```text
Smart_city_Mobile/src/config/api.js
```

The checked-in configuration points to:

```text
https://54.87.203.253.sslip.io/api
```

To use a different backend, update `API_BASE_URL` in that file and rebuild or reload the app:

```js
export const API_BASE_URL = 'https://your-api.example.com/api';
```

There is no `.env` loader in the current codebase. Avoid committing production secrets; the mobile client should contain only a public API origin, never server credentials.

When using a backend on your development machine:

- Android Emulator normally reaches the host at `10.0.2.2`.
- iOS Simulator can normally use `localhost`.
- A physical device must use an address reachable on the same network.
- Prefer HTTPS. Additional Android Network Security or iOS App Transport Security configuration may be required for plain HTTP.

### API Capabilities Used by the App

| Capability | Main paths |
| --- | --- |
| Authentication | `/auth/login/step1`, `/auth/login/step2`, `/auth/refresh-token`, `/auth/logout` |
| Password reset | `/auth/forgot-password/step1`, `/auth/forgot-password/step2` |
| Profile | `/protected/profile`, `/protected/profile/image` |
| Announcements and ads | `/announcements`, `/advertisements` |
| Bills | `/bills`, `/bills/:id`, `/bills/admin/rooms`, `/bills/bulk` |
| Bill payments | `/bill-payments`, `/bill-payments/:billId/submit`, `/bill-payments/:id/proof`, `/bill-payments/:id/review` |
| Parking availability | `/parking`, `/parking/visitor`, `/parking/resident` |
| Notifications | `/notifications`, `/notifications/unread-count`, `/notifications/:id/read`, `/notifications/mark-all-read`, `/notifications/device-token` |
| Admin notifications | `/notifications/residents`, `/notifications/send`, `/notifications/:id/submit` |
| Helpers | `/helpers`, `/helpers/catalog`, `/helper-requests` |
| My Wallet and shops | `/rfid-wallet/me`, `/rfid-wallet/adjust`, `/rfid-wallet/merchants`, `/rfid-wallet/pay`, `/rfid-wallet/merchants/:id/ledger`, `/rfid-wallet/merchants/:id/settle` |
| Playground | `/playground/config`, `/playground/registrations`, `/playground/registrations/:id/status` |
| Visitors | `/visitors`, `/visitors/register`, `/visitors/:id/qr`, `/api/qr-scan` |
| Reports and SOS | `/reports`, `/reports/mine`, `/reports/:id/submit`, `/sos` |
| AI assistant | `/ai/chat`, `/ai/voice`, `/ai/history`, `/ai/history/sessions`, `/ai/history/:conversationId`, `/ai/feedback` |
| AI feedback review and RAG Admin view | `/ai/feedback/admin`, `/ai/feedback/:id/review`, `/knowledge`, `/knowledge/:id` |
| Admin audit log | `/audit-logs` |
| MCP discovery | `/mcp/tools` |

Authenticated requests send `Authorization: Bearer <access-token>`. Access and refresh tokens are stored in AsyncStorage. If an authenticated HTTP request returns `401`, the client attempts one token refresh before clearing the local session. Socket.IO also authenticates with the access token and updates that token before a reconnect attempt.

## Firebase Push Notifications

Push registration starts after a user signs in. The client sends the FCM device token and platform to `/notifications/device-token` and refreshes the token when Firebase rotates it.

### Android

Place the Firebase Android configuration at:

```text
Smart_city_Mobile/android/app/google-services.json
```

The Gradle build enables the Google Services plugin only when this file exists. Android 13 and newer will request notification permission at runtime. The application creates separate channels for urgent alerts, community updates, and helper requests.

### iOS

Add the matching `GoogleService-Info.plist` to the `SmartCityMobile` Xcode target, configure signing, enable Push Notifications and Background Modes/Remote notifications, and configure APNs in Firebase. Then reinstall pods and rebuild the native application.

If Firebase or Notifee is missing from an existing native build, JavaScript hot reload is not sufficient; rebuild the application.

### Backend Firebase Admin

The Android/iOS Firebase files identify the client application; they do not authorize the backend to send device pushes. Configure one Firebase Admin credential source in the backend environment:

```dotenv
# Option 1: full service-account JSON on one line
FIREBASE_SERVICE_ACCOUNT_JSON=

# Option 2: path to a protected service-account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=

# Option 3: Application Default Credentials
GOOGLE_APPLICATION_CREDENTIALS=

# Option 4: individual values
FIREBASE_PROJECT_ID=prime-city-2915c
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Use only one credential source, restrict access to the credential file, and never commit the private key. Without Firebase Admin credentials, MongoDB notifications and foreground/in-app Socket.IO delivery still work, but background or terminated-app device push cannot be sent by the server.

The EC2 notification service completed a one-resident real delivery test on 2026-08-15: the API returned `201`, the MongoDB notification was confirmed, the authenticated Socket.IO client received the matching realtime event, and Firebase returned one success with zero failures. This confirms the deployed Firebase Admin environment is valid for server-to-FCM delivery. Foreground, background, and force-closed notification display must still be observed on the target physical resident device before declaring all three Android lifecycle states complete.

The current Android channels are `community_updates_v2`, `helper_requests_v2`, and `urgent_alerts_v2`. Android channel sound and importance cannot be changed programmatically after a channel is first created, so the V2 identifiers ensure the upgraded defaults are applied without deleting the user's older channels. A resident can still mute or disable any channel from Android Settings.

### Private payment-proof storage

The backend stores new payment proofs in the same private MongoDB deployment through the `bill_payment_proofs` GridFS bucket. There is no public file URL: Admin/Staff or the owning resident must authenticate through `/bill-payments/:id/proof`, and every read is ownership/room scoped. Existing legacy private-file submissions remain readable through the protected compatibility path; new uploads do not use the EC2 public filesystem.

### Version 2 database migration

From `prime_city_be/Node_Backend`, preview the additive migration without changing data:

```bash
npm run migrate:v2
```

After backing up MongoDB and deploying the matching backend code, apply it once:

```bash
npm run migrate:v2:apply
```

The migration adds lifecycle defaults to legacy announcements, zero-value breakdown fields to legacy bills, the seven-day payment warning, and missing room-finance values. Existing non-zero room prices and installment progress are preserved. It also creates the billing/payment/room indexes and does not delete bills, announcements, users, or rooms.

The My Wallet/shop and visitor-pass additions are additive and do not require rewriting existing records. On first use, MongoDB creates `primecitymerchants` and `merchantsettlements`, and the wallet transaction collection adds merchant/reference/idempotency fields and indexes. Existing visitor records remain `WalkIn` by default; new authenticated pre-registrations add QR status, validity, and one-time scan fields. Verify index creation in production if Mongoose automatic index creation is disabled.

### August 2026 billing initialization

On 2026-08-15, the three unassigned legacy/demo bills were copied to the recoverable `servicebill_archives` collection and removed from the active bill list. August 2026 bills were then created for all 30 occupied rooms with the room-type monthly apartment installment, a `1,000 MMK` service fee, and a seven-day due date. Available rooms were not billed. All 30 bills and in-app notifications were verified in MongoDB with no orphan rooms, duplicate room/month keys, service-fee mismatches, or total-calculation mismatches.

After that initial batch, resident `Flex` was assigned to the newly Occupied Standard room `A-S53`. Its missing August 2026 charges were created idempotently for `2,001,000 MMK` (`2,000,000 MMK` installment plus `1,000 MMK` service fee), with a database notification and successful FCM delivery. This brought August coverage to all 31 Occupied rooms.

On 2026-08-15, all 31 still-unpaid combined August records were split transactionally into 31 Apartment Installment bills and 31 Service Fee bills. The original 31 records were copied to the recoverable `servicebill_archives` collection before the split. There were no payment submissions, missing resident links, or category-key conflicts; the total remained exactly `106,031,000 MMK`. The migration created 31 additional in-app notifications. FCM push succeeded for 20 resident accounts with registered device tokens, skipped 11 accounts without tokens, and reported no send failures.

## Running the App

Start Metro in the first terminal:

```bash
cd Smart_city_Mobile
npm start
```

Run one platform from a second terminal.

### Android

```bash
cd Smart_city_Mobile
npm run android
```

### iOS

```bash
cd Smart_city_Mobile
npm run ios
```

You can also open `android/` in Android Studio or `ios/SmartCityMobile.xcworkspace` in Xcode.

The application requests microphone access for voice chat, speech-recognition access on iOS, and notification permission where the operating system requires it.

## Available Scripts

Run these commands from `Smart_city_Mobile/`:

| Command | Description |
| --- | --- |
| `npm start` | Start the Metro development server |
| `npm run android` | Build and launch the Android app |
| `npm run ios` | Build and launch the iOS app |
| `npm test` | Run the Jest test suite |
| `npm run lint` | Run ESLint across the project |

## Testing and Quality Checks

Run the mobile checks:

```bash
cd Smart_city_Mobile
npm test -- --runInBand
npm run lint

cd android
./gradlew :app:assembleDebug
```

Run the backend checks from the separate backend project:

```bash
cd ../prime_city_be/Node_Backend
npm test
```

Verification performed for the Version 2 update:

- Mobile Jest application, Admin AI/RAG API, and single/multiple notification-target tests: 7 of 7 passed.
- ESLint: zero errors; eight pre-existing non-blocking inline-style warnings intentionally left unchanged.
- Android debug build: `BUILD SUCCESSFUL`.
- Android production JavaScript bundle: generated successfully with all assets.
- iOS was intentionally not retested in this Android-first phase.
- Android cold launch: verified twice after force-stop with no fatal runtime or application-registration error.
- Backend privacy, intent, reviewer, room-scope, visitor-scope, category-billing, exact-amount, private-proof, payment-state, room-finance, audible-push payload, role-escalation, wallet/merchant authorization, signed visitor QR, and bounded notification-target tests: 48 of 48 passed. This includes all/single/multiple recipient handling, short-JWT compatibility, and unchanged signatures for existing 32+ character QR secrets.
- MongoDB GridFS proof round-trip in an isolated test database: upload, private metadata, byte-identical download, and cleanup passed.
- Isolated-database billing E2E: monthly total creation, resident own-room read, exact-amount screenshot submit, Admin queue, owner/Admin private-proof access, Under Review, atomic Paid approval, notification creation, and Paid readback passed.
- Billing negative/security E2E: cross-room bill read returned `404`, another resident's private proof returned `403`, double approval returned `409`, and resubmission after Paid returned `409`.
- Category-billing isolated-database E2E: separate Apartment Installment and Service Fee generation, duplicate prevention, resident scope, private GridFS proof access, Admin room/category visibility, and Service Fee-only approval passed; the separate installment remained Pending and installment progress remained unchanged.
- Isolated-database maintenance E2E: Active notice was visible to its resident audience, completion changed it to `Completed` and removed it from the resident active list, notification records were created, and archive changed it to `Archived` without reactivating it.
- The isolated test database and temporary private payment-proof directory were removed immediately after verification.
- Remote MongoDB V2 migration dry-run: connected successfully and reported 8 legacy announcements and 3 legacy bills; no production data was changed by the dry-run.
- EC2 one-resident notification integration: API `201`, DB persisted, authenticated realtime event received, FCM success count `1`, failure count `0`; physical-device foreground/background/closed display remains a manual lifecycle check.
- Android emulator smoke test: Home rendered, the resident `My Wallet` screen rendered, and the updated Pre-register Visitor form rendered with the visit date. The currently deployed EC2 backend returned the expected `404` for the new wallet endpoint because this local backend phase has not yet been deployed.
- The shop-payment transaction and ESP32/display pre-registration scan have not been declared end-to-end complete: deploy the matching backend, configure the visitor signing secret, create an approved test merchant, assign/top up a test RFID wallet, and run the physical gate/device checks first.

The privacy tests explicitly verify that a resident cannot override the authenticated room/user scope when asking the AI about bills or visitor history. Add focused regression tests whenever authorization, data scope, notification delivery, or AI tools change.

## Docker (Metro Only)

The included Dockerfile installs the JavaScript dependencies and exposes Metro on port `8081`:

```bash
cd Smart_city_Mobile
docker build -t smart-residential-mobile .
docker run --rm -it -p 8081:8081 smart-residential-mobile
```

This container runs the Metro bundler only. It does not build an APK/IPA, start an emulator, or provide the backend service.

## Release Builds

### Android

The release signing configuration reads the following Gradle properties:

```properties
SMARTCITY_UPLOAD_STORE_FILE=/absolute/path/to/upload-key.keystore
SMARTCITY_UPLOAD_STORE_PASSWORD=your-store-password
SMARTCITY_UPLOAD_KEY_ALIAS=your-key-alias
SMARTCITY_UPLOAD_KEY_PASSWORD=your-key-password
```

Keep these values outside version control, then build from the Android directory:

```bash
cd Smart_city_Mobile/android
./gradlew assembleRelease
# or
./gradlew bundleRelease
```

The production upload keystore and its four signing values are not recoverable from source code or an AAB. Keep at least two encrypted backups in separate secure locations, and record which Google Play application they belong to. Never commit the upload keystore or signing passwords. `google-services.json` identifies the Firebase Android client but does not replace the upload keystore.

### iOS

Open `Smart_city_Mobile/ios/SmartCityMobile.xcworkspace`, select the correct development team and bundle identifier, configure signing, and use **Product > Archive** in Xcode.

## Troubleshooting

### Metro cache or stale JavaScript

```bash
cd Smart_city_Mobile
npm start -- --reset-cache
```

### Android cannot find a device

```bash
adb devices
```

Start an emulator or enable USB debugging on the physical device before running `npm run android`.

### Android native build is stale

```bash
cd Smart_city_Mobile/android
./gradlew clean
cd ..
npm run android
```

### iOS dependency or native-module errors

```bash
cd Smart_city_Mobile
bundle exec pod install --project-directory=ios --repo-update
npm run ios
```

### Push notifications or voice features do not load

Confirm that the native configuration files and permissions are present, reinstall dependencies, reinstall iOS pods when applicable, and perform a full native rebuild. Metro reload alone cannot add native modules to an already installed application.

## Contributing

1. Create a focused feature branch.
2. Keep API access in `src/api/` or `src/services/` rather than directly in screens.
3. Reuse the existing contexts and theme tokens for shared state and colors.
4. Add or update tests for changed behavior.
5. Run the test and lint commands before opening a pull request.
