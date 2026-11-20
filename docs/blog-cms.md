# Blog CMS

How the editorial CMS in this app works. The data model, security rules,
serverless endpoints and deployment order are documented with the public site in
`Saad-Portfolio/docs/editorial-cms.md`.

## Screens

| Route | What it's for |
|---|---|
| `/blogs` | All posts by status (draft, in review, scheduled, published, archived), featured ordering, "Run scheduler" |
| `/blogs/new`, `/blogs/:id` | The editor |
| `/authors` | Author profiles (the first one becomes the default) |
| `/series` | Series and the reading order of their parts |
| `/analytics` | First-party article analytics and integration status |
| `/redirects` | Automatic and manual redirects (loops rejected) |
| `/not-found` | Missing pages readers hit, with one-click redirects |
| `/blog-settings` | Article types, categories, reading speed, reactions, default author, site connection status |

## The editor

- **Left:** title, subtitle, slug (follows the title until edited or published),
  excerpt, and the article body.
- **Right, tabbed:** Publish · Details · Images · SEO · Social · Related · Sources · History.
- **Top bar:** status, autosave state, SEO completeness score, Preview, Save
  (adds a restore point), the primary action (Publish / Schedule / Update /
  Update schedule) and a menu for review, unpublish, unschedule, archive, delete.

### Editor (TipTap 3)

Kept TipTap: it already powered the old editor and supports every required
block, so existing posts load without conversion. Added:

- Headings H1–H4, bold/italic/underline/strike, inline code, links (Ctrl+K),
  alignment, bulleted/numbered lists with indent/outdent, quotes, code blocks with
  a language picker and highlighting, tables (rows/columns/header/merge), undo/redo.
- **Insert** menu: image (width ¾/½/⅓, left/right/wide, alt, caption, credit +
  link), gallery, carousel, image beside text, video/embed (YouTube, Vimeo, Loom,
  CodePen only), chart (bar/line from pasted rows), pull quote with attribution,
  info/tip/note/warning/important boxes, copyable prompt, two columns, table,
  line/dots dividers, table of contents, sources & references, custom HTML
  (sanitised on the site with a strict allow-list).

Content is saved as HTML for the site plus the editor's JSON document.

### Saving

- Autosaves ~2.5 s after you stop typing; no request when nothing changed.
- For **published or scheduled** posts, edits autosave privately and go live only
  on **Update** ("Unpublished changes" badge; "Discard unpublished changes" in the menu).
- Another tab or device saved first? A dialog lets you load theirs or keep yours
  (theirs is kept in History).
- Offline or failing: retries automatically and keeps a copy on this device;
  reopening the post offers to restore it.
- Leaving the tab with unsaved changes asks for confirmation.

### Revisions

Recorded on publish, update, schedule, Save, restores and at most every 10
minutes while editing. History compares any version with the current editor
(changed fields + word-level content diff) and restores it (the current version
is saved first).

### Scheduling

Pick a date, time and time zone under Publish, then **Schedule**. The site's
scheduler publishes it within ~10 minutes of that time (GitHub Actions; daily on
Vercel Hobby cron alone), and sends incomplete posts back to draft with the
reason shown under Publish.

### Previews

**Preview** saves pending edits, then opens the real article page from the site
at `/preview/:id` (desktop/tablet/mobile widths or a new tab). Links expire after
30 minutes and are never indexed.

## Configuration

`.env.example` lists the Firebase variables and the optional `VITE_SITE_URL`.
The CSP in `vercel.json` allows calling and framing `https://www.saadmaz.com`
and the four embed providers; add your local site origin there if you develop
against `vercel dev`.

## Tests

`npm test` covers: editor round-trips for every block and for legacy HTML, the
embed URL allow-list, chart data parsing, autosave (debounce, dedupe, conflicts,
retries, live-post routing, creation), SEO checks and previews, revision diffs,
reading time (shared vectors with the site), redirects, time zones and image
validation.
