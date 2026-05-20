# 🚀 Pre-Deployment Security & Stability Checklist

This checklist contains critical tasks to complete before moving the Travel Planner app to a production environment.

## 1. Firebase Security Rules (Critical)
Since the app uses the Firebase Admin SDK on the server, we should disable all direct client-side access to prevent unauthorized external manipulation.
- [ ] **Firestore:** Set rules to "Deny All" (only the server Admin SDK will have access).
- [ ] **Storage:** Set rules to "Public Read / Private Write" (so users can view attachments, but only the server can upload/delete).

## 2. Infrastructure & Configuration
- [ ] **Firestore Indexes:** Ensure all composite indexes are created via the Firebase Console (links provided in the commit history/server logs).
- [ ] **Environment Variables:**
    - [ ] Verify all variables from `.env.example` are set in the hosting provider's (e.g., Vercel, Firebase Hosting) dashboard.
    - [ ] Ensure `FIREBASE_PRIVATE_KEY` handles newlines (`\n`) correctly in the production environment.
- [ ] **Storage Bucket:** Confirm the default bucket is initialized and matches the `PUBLIC_FIREBASE_STORAGE_BUCKET` variable.

## 3. Authentication & Access Control
- [ ] **Authorized Domains:** In Firebase Console (Auth > Settings > Authorized Domains), add your production domain (e.g., `myapp.vercel.app`) to allow Google Sign-In and session creation.
- [ ] **Session Security:** Ensure the `secure: true` flag in `src/routes/api/session/+server.ts` is only active on HTTPS (it currently is).

## 4. Code Quality & Validation
- [ ] **Input Sanitization:** Implement schema validation (e.g., Zod) for API endpoints (`/api/trips`, `/api/events`, etc.) to prevent malformed data.
- [ ] **Error Handling:** Review server logs for any unhandled rejections during high-concurrency file uploads.
- [ ] **Firebase App Check:** (Optional but recommended) Enable App Check to protect your backend from unauthorized traffic.

## 5. Final Verification
- [ ] Run `npm run check` to ensure no TypeScript regressions.
- [ ] Run `npm run test:e2e` to confirm all core user flows (Login -> Create Trip -> Add Event -> Upload File) work in a production-like environment.

---
*Created on 2026-05-20*
