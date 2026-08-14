# Voxnote Backend Setup (Firebase)

Voxnote works out of the box with **local-only demo accounts** — notes and
your account stay on-device, nothing leaves the browser. That's fine for
testing, but before you publish to the Play Store you'll want real accounts
that sync across devices. This guide wires that up with **Firebase**
(Authentication + Firestore), which has a generous free tier and doesn't
require a credit card to start.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Name it (e.g. "Voxnote"), and you can skip Google Analytics for now.
3. Once created, click the **web icon (`</>`)** on the project overview page to register a web app. Name it "Voxnote Web".
4. Firebase will show you a config object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "voxnote-xxxx.firebaseapp.com",
     projectId: "voxnote-xxxx",
     storageBucket: "voxnote-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
   Copy each value into `.env.local` (copy `.env.example` first) under the matching `VITE_FIREBASE_*` key.

## 2. Turn on Authentication

In the Firebase console: **Build → Authentication → Get started**.

- Enable **Email/Password** (the toggle under Sign-in method).
- Enable **Google** too if you want the "Continue with Google" button to work — just pick a support email when prompted.

That's it — no other config needed. Voxnote's `src/lib/authService.ts` already calls the right Firebase Auth functions for sign-up, login, Google sign-in, and logout.

## 3. Turn on Firestore (for note syncing)

**Build → Firestore Database → Create database.** Start in **production mode**, pick a region close to your users (e.g. `eur3` or `nam5`), and create it.

Then go to the **Rules** tab and replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/meta/settings {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/meta/billing {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // set only by the server — see the Paystack section below
    }
  }
}
```

This makes sure each signed-in user can only ever read or write their own
notes and settings — and, importantly, that nobody (including the account
owner) can grant themselves a fake "Pro" status by writing to their own
billing document from the browser. Only your server can write that, once
you wire up Paystack below.

## 4. Install the new dependency

```
npm install
```

(This pulls in the `firebase` package that's already listed in `package.json`.)

## 5. Run it

```
npm run dev
```

Sign up through the Voxnote onboarding flow — you should see the new user appear under **Authentication → Users** in the Firebase console within a second or two, and any note you record should appear under **Firestore Database → users/{your-uid}/notes**.

## How the fallback works

Every Firebase call in this app is wrapped so it silently no-ops if `VITE_FIREBASE_*` isn't set — that's `isFirebaseConfigured` in `src/lib/firebase.ts`. That's why the app didn't break while you didn't have a Firebase project yet, and it's also why you can keep developing offline: just leave `.env.local` blank and everything falls back to on-device storage automatically.

## 6. Going to production

- Switch Firestore Rules from "production mode" defaults (above) — double-check them before launch, since misconfigured rules are the #1 cause of Firebase data leaks.
- Consider adding [App Check](https://firebase.google.com/docs/app-check) once you're closer to launch, to stop bots from hammering your Firebase project's free quota.
- The `GEMINI_API_KEY` used by `server.ts` is separate from Firebase — that still needs to be set wherever you deploy the Node server (it's server-side only and never exposed to the browser).
- If you outgrow Firestore's free tier limits, Firebase's pay-as-you-go pricing is usage-based — you won't get a surprise flat fee, only a bill proportional to real usage.

---

# Pro Billing Setup (Paystack)

The Pricing page's "Start 7-Day Free Trial" button currently just flips a
local flag. This section wires it to **real Paystack subscriptions**, with
payment confirmation flowing through a webhook into Firestore — so Pro
status can never be faked by editing browser storage.

Paystack was chosen over Stripe here because Stripe doesn't support
Nigerian-registered businesses directly — Paystack does, settles to a
Nigerian bank account in Naira, and (since 2020) actually runs on Stripe's
own infrastructure under the hood.

## 1. Create Paystack plans

In the [Paystack Dashboard](https://dashboard.paystack.com) (start in **Test Mode**, toggle top-right):

1. Go to **Payments → Plans → Create Plan**.
2. Create one plan named "Voxnote Pro Monthly" — set the amount (e.g. ₦9.99's local equivalent, or whatever you're charging) and interval to **Monthly**.
3. Create a second plan "Voxnote Pro Annual" — same idea, interval **Annually**.
4. Copy each plan's code (looks like `PLN_xxxxxxxxxx`) into `PAYSTACK_PLAN_MONTHLY` / `PAYSTACK_PLAN_ANNUAL` in `.env.local`.
5. Go to **Settings → API Keys & Webhooks**, copy your **Secret Key** (starts `sk_test_` in test mode) into `PAYSTACK_SECRET_KEY`.

Unlike Stripe, Paystack doesn't use a separate webhook signing secret — your
same secret key is used to verify webhook signatures, so there's nothing
extra to copy for that part.

## 2. Get a Firebase service account key

Paystack webhooks land on your server, not the browser — so the server needs
its own trusted way to write to Firestore, separate from the client SDK.
That's what `firebase-admin` + `FIREBASE_SERVICE_ACCOUNT` are for.

**Firebase console → Project Settings (gear icon) → Service Accounts → Generate new private key.**
This downloads a JSON file. Open it, copy the entire contents, and paste it
as a single-line string into `FIREBASE_SERVICE_ACCOUNT` in `.env.local`.

Keep this file secret — it has full admin access to your Firebase project.
Never commit it or send it to the browser.

## 3. Lock down the billing document

Update your Firestore rules (from the section above) so the client can
*read* its own billing status but never *write* it — only your server
(via the Admin SDK, which ignores rules) should ever set `isProPlan: true`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/meta/settings {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/meta/billing {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // only the Admin SDK (server) may write this
    }
  }
}
```

Note: the server also writes a small `paystackCustomers/{customerCode}`
mapping document (used internally to link a Paystack customer back to a
Firebase uid on renewal/cancellation events). It isn't under `users/{uid}`,
so the rules above already deny client access to it by default — nothing
extra to add.

## 4. Forward webhooks while testing locally

Paystack doesn't have a CLI tool like Stripe's `stripe listen` — instead,
use a tunnel to expose your local server so Paystack's servers can reach it:

```
npx localtunnel --port 4000
```

(or [ngrok](https://ngrok.com) if you already use that). Either prints a
public URL like `https://random-name.loca.lt`.

In the Paystack Dashboard → **Settings → API Keys & Webhooks**, set your
**Webhook URL** to `https://your-tunnel-url/api/webhooks/paystack`.

## 5. Test the full flow

```
npm run dev
```

Sign up, go to Pricing, and start a trial. You should get redirected to a
real Paystack Checkout page. Use [Paystack's test cards](https://paystack.com/docs/payments/test-payments/) (e.g. `4084 0840 8408 4081`, any future
expiry, CVV `408`, PIN `0000`, OTP `123456`). After paying, Paystack
redirects you back and — within a second or two — the app should flip to
"Pro Active", driven by the webhook writing to
`users/{uid}/meta/billing` in Firestore.

To test cancellation, click **Manage Pro Subscription** from the Pricing
page — that opens a real Paystack-hosted subscription management page.

## 6. Going live

- Switch to your live secret key (`sk_live_...`) and live plan codes once you're ready — Paystack keeps test and live data completely separate, so you'll need to recreate the two plans in Live Mode too.
- Update the webhook URL in the Paystack Dashboard to your real production domain once deployed (`https://yourdomain.com/api/webhooks/paystack`) instead of the tunnel URL.
- Paystack requires a bit of business verification (BVN/CAC docs, bank account) before you can go live and receive real payouts — start that from **Settings → Compliance** in the dashboard, since it can take a few days to clear.
- If you plan to also sell Pro as an in-app purchase from inside the Play Store app (rather than only through the web checkout), that's a separate integration — Google Play Billing — since Play Store policy generally requires digital subscriptions purchased *inside* an Android app to go through Play Billing, not an external payment page. Paystack Checkout is the right call for the web version; ask me when you're ready to wrap this in an Android shell and I can help you figure out whether Play Billing, RevenueCat, or an external-purchase link fits your situation.

