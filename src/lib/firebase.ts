/**
 * lib/firebase.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all Firebase SDK instances.
 *
 * Exports:
 *   auth     – Firebase Authentication (login / session management)
 *   db       – Cloud Firestore (all data reads & writes)
 *   storage  – Firebase Storage (image uploads)
 *
 * All config values come from Vite environment variables so that
 * different values can be used in development vs production without
 * touching the source code.
 *
 * How to set these up:
 *   • Local dev  → create frontend/.env  (never commit to git)
 *   • Production → add each VITE_FIREBASE_* key in the Vercel dashboard
 *                  under Settings → Environment Variables
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─── Firebase project config ────────────────────────────────────
// These are PUBLIC identifiers - safe to ship in the browser bundle.
// Security is enforced by Firestore Security Rules, not by hiding these keys.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ─── App singleton ───────────────────────────────────────────────
// Prevent "Firebase app already exists" errors during hot-reloads.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ─── Service exports ─────────────────────────────────────────────
export const auth = getAuth(app);      // Firebase Auth
export const db   = getFirestore(app); // Firestore database

export default app;
