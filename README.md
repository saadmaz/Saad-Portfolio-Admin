# Saad-Portfolio-Admin

Admin CMS for [saadmaz.com](https://www.saadmaz.com), split out of the main
[Saad-Portfolio](https://github.com/saadmaz/Saad-Portfolio) repo so the public
site doesn't ship admin code, and deployed separately (intended for
`admin.saadmaz.com`).

Talks to the same Firebase project as the public site — Firebase Auth for
login and Firestore security rules (`isAdmin()` checked by email) for write
access. Moving this to its own repo/subdomain does not change that access
control; it only stops the admin UI, forms, and rich-text editor from being
shipped in the public bundle.

## Setup

```bash
npm install
cp .env.example .env   # fill in the Firebase config (same project as the public site)
npm run dev
```

## Deploy

Deployed as its own Vercel project pointed at `admin.saadmaz.com`. Set the
same `VITE_FIREBASE_*` environment variables in the Vercel project settings.
