# B2B Store app: how it connects to Shopify, and what's left to switch on

## How it fits together

| Part | What it does | Where its data lives |
|---|---|---|
| `mobile/` (iOS + Android app, Expo / React Native) | Catalogue, sets, prices, MRP, stock, cart, order pad, WhatsApp paste, checkout, My Shop | Reads Shopify directly (Storefront API) |
| `server/` (B2B Store app server, deploys to Vercel) | Phone OTP login, shop profile, orders and tracking, bills, owner settings, order alerts | Shopify Admin API: customers, customer metafields, orders, metaobjects |
| Shopify app "B2B Store App" (`server/shopify.app.toml`) | Gives the server permission to the store and sends order webhooks | Installed on b2bstore.in only |
| Shopify checkout | Payment (Razorpay: UPI, cards), GST, shipping | Same checkout and order list as the website |

Nothing is stored outside Shopify. Change a price, stock or photo in Shopify and the app shows it. Orders placed in the app appear in Shopify admin, the CRM sheet and the website's order history.

The owner edits app content in **Shopify admin → Content → Metaobjects → B2B app settings** (created 18 Nov 2026, one entry "main"):
offer banner, WhatsApp number, support phone, factory address, home collections. **Add the WhatsApp number and support phone there** to switch on the app's contact buttons.

Shop profiles entered in the app (shop name, GSTIN, business type, transport, categories) appear on each customer's page in Shopify admin under Metafields.

## Verified on the live store (18 Nov 2026)

- Products, sets ("Sample", "Set of 4 pcs | 22-24-26-28"…), MRP and sold-out sets load live. The parser handles all 250 sampled products.
- Shopify cart works, including stock warnings (a sold-out set is refused with a clear message).
- Shopify checkout opens with **Razorpay (UPI, cards)**. GST 5% is added on top (₹265 → ₹278.25).
- Customers are found by phone, so a shop that ordered on the website sees its old orders after signing in.
- Order detail shows courier, tracking number, link and any balance due.
- Server: 7 automated tests pass; type checks pass for app and server.

## Status (18 Nov 2026)

- Shopify app **B2B Store App** created in the store's own organization and installed. Keys are in `server/.env` (git-ignored). Client-credentials token works.
- Tested locally against the live store: settings from Shopify, OTP login (test mode), My Shop, order list and order detail with Delhivery tracking, and other shops' orders refused.
- `read_all_orders` added and approved (18 Nov): full order history shows.
- **Server live (18 Nov): https://b2bstore-app-server.vercel.app** (Vercel project `b2bstore-app-server`, Mumbai region). Health, settings, login and orders tested in production. Login codes are never returned by the live server.
- Order-alert webhooks registered (orders/create, orders/fulfilled, fulfillments/create, fulfillments/update); signed test event accepted, unsigned refused.
- Until MSG91 is set up, real SMS/WhatsApp codes are not sent. Only the owner's own number (set as REVIEW_PHONE in Vercel) can sign in, with the private test code in `server/.env.production.local`.
- Redeploy after changes: `cd server && npm run deploy` (type check, tests, bundle, deploy).
- To do: **rotate the client secret** (shared in chat), then update it in Vercel (`vercel env add SHOPIFY_CLIENT_SECRET production --force`) and in `server/.env`.

## Steps that need you (accounts, passwords, payments, approvals)

1. **Shopify app** (10 min, must be done from B2B Store's own Shopify account):
   - Sign in to the **b2bstore.in admin as the store owner** (or a staff account with app-development permission). Go to **Settings → Apps → Develop apps**, which opens the Dev Dashboard in the store's own organization.
   - Why this matters: the server signs in with Shopify's *client credentials*, which only works when the app and the store are in the **same Shopify organization**. An app made in an agency/partner account would need a full OAuth install, plus an IP allowlist that Shopify requires for outside custom apps from 20 Nov 2026. Vercel has no fixed IPs, so that path doesn't work here.
   - **Create app → Start from Dev Dashboard**, name it "B2B Store App".
   - **Versions → Create version**: keep the default App URL, Webhooks API version **2026-10**, scopes `read_products, read_customers, write_customers, read_orders, read_all_orders, read_fulfillments, read_metaobjects`. (`read_all_orders` lets shops see orders older than 60 days; without it only recent orders show.) Fill in the protected customer data request (the app uses name, phone and address to show a shop its own orders). Then **Release**.
   - **Install app** on b2bstore.in and approve.
   - From the app's **Settings**, put the client ID and secret straight into Vercel (step 2). Never paste the secret in chat.
   - After deploying, I run `npm run webhooks` (server folder) to switch on order alerts. No Shopify CLI is needed.
2. **Hosting** (free tier): create a Vercel account and log in once here with `npx vercel login`. I then deploy `server/` and set the environment values from `server/.env.example`.
3. **OTP messages**: create an MSG91 account (India), complete DLT registration for SMS, and get a WhatsApp OTP template approved. Paid per message.
4. **Expo account** (free) for cloud builds: `npx eas-cli login` here. This Mac has no Xcode or Android Studio, so builds run in Expo's cloud.
5. **Apple and Google developer accounts** in the company's name (D-U-N-S first). Then I prepare the store listings and submit.
6. **Square logo file** (optional): save the square B2B STORE wordmark as a PNG in `mobile/assets/brand-src/` if you prefer it to the round badge for the icon.

## MSG91 login codes (OTP), step by step

Indian telecom rules (TRAI DLT) require every business SMS sender to be registered before codes can be sent. Approvals usually take a few working days, so start early.

1. **Create an MSG91 account** at msg91.com with a business email, and verify it.
2. **DLT registration** (one time) on any operator's DLT portal (Jio, Airtel, Vi or BSNL) as a *Principal Entity*, in the company's name: **EMM AAR KNITWEARS**, with PAN, GSTIN 03AEHPG3068H1ZS and an authorisation letter. Note the **Entity ID**. The portal may charge a registration fee.
3. On the same DLT portal, register:
   - a **Sender ID** (6 letters), for example `BTBSTR`
   - an **OTP template** (category: Service Implicit / OTP), for example:
     `{#var#} is your B2B Store login code. Do not share it with anyone. - EMM AAR KNITWEARS`
   Note the **DLT Template ID**.
4. **In MSG91 → OTP**, add the DLT details (Entity ID, Sender ID, DLT Template ID) and create an OTP template with `##OTP##` where the code goes. Copy the **MSG91 template ID**.
5. **MSG91 → Authkey**: create an auth key. Add some balance (OTP SMS are charged per message).
6. Optional, **WhatsApp OTP**: in MSG91 → WhatsApp, connect a WhatsApp Business number and create an *authentication* template. Meta approves it. Note the number and template name.
7. Put the values in `server/.env` (never in chat):
   ```
   OTP_PROVIDER=msg91
   MSG91_AUTH_KEY=...
   MSG91_SMS_TEMPLATE_ID=...
   MSG91_WHATSAPP_NUMBER=...      # optional
   MSG91_WHATSAPP_TEMPLATE=...    # optional
   ```
   Then I copy them to Vercel, redeploy and send a real test code to your phone.

## Phone builds (Expo)

- `mobile/eas.json` has two profiles: **preview** (Android APK you can install directly from a link, for testing) and **production** (store builds).
- Android test builds need only an Expo account. iPhone builds on real devices need the Apple Developer account (D-U-N-S first).
- Expo account **shivambhandari333**, project **@shivambhandari333/b2bstore**. Android signing key is stored by Expo.
- Build (the git folder on this Mac is the whole home folder, so always build from the app folder only):
  `cd mobile && EAS_NO_VCS=1 EAS_PROJECT_ROOT=$PWD npx eas-cli build --platform android --profile preview`

## Decisions for the owner (from the live data)

- **Part-payment**: most website orders are part-paid through "B2bStore<>rabbitpay". The app's checkout uses Shopify checkout (Razorpay), which collects the full amount. Keep the app full-advance, or ask RabbitPay whether they support mobile apps?
- **2% advance discount**: the website banner promises it, but Shopify checkout doesn't apply it today. Add an automatic discount in Shopify, or change the banner text in the app settings.
- **GST** is added on top at checkout, so app prices are shown before GST, as on the website.

## Still to build before store submission

- Push alerts on the phone (server side is ready; app registration comes with the first device build)
- Shopify Checkout Kit (native checkout sheet) in the device build; the in-app browser is used until then
- Hindi text for all screens
- App icon: done from the store's round badge logo. To use the square wordmark instead, save it as a file and run `sh mobile/scripts/make-icons.sh <file>`
- Update 2 screens: business report, my stock, sales book, reports, staff access, customer mode, referrals, offline mode

## Running locally

```bash
cd mobile && npx expo start --web --port 3850   # app in the browser, live store data
cd server && cp .env.example .env && npm run dev # server on :3860
cd server && npm test                            # server tests
```
