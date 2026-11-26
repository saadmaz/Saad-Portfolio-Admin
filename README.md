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

## Blog CMS

The blog editor (statuses, autosave, revisions, scheduling, secure previews,
authors, series, redirects, 404 monitor, analytics, SEO and social previews) is
described in **[docs/blog-cms.md](docs/blog-cms.md)**. Previews, rebuilds and
the scheduler button call the public site's `/api/admin`, which needs the site's
CMS environment variables (see `Saad-Portfolio/docs/editorial-cms.md`).

## Setup

```bash
npm install
cp .env.example .env   # fill in the Firebase config (same project as the public site)
npm run dev
```

## Deploy

Deployed as its own Cloudflare Pages project (build `npm run build`, output `dist`)
pointed at `admin.saadmaz.com`. Set the same `VITE_FIREBASE_*` variables in the
Pages project's build settings. Headers and redirects live in `public/_headers`
and `public/_redirects`.
