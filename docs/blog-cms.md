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
- **Insert** menu, grouped:
  - *Writing:* heading, paragraph, quote, pull quote, line/dots dividers, table,
    two columns.
  - *Media:* image (width ¾/½/⅓, left/right/wide, alt, caption, credit + link),
    gallery, carousel, image beside text, video/embed (YouTube, Vimeo, Loom,
    CodePen only), chart (bar/line from pasted rows).
  - *Developer resources:* prompt block, code block, step-by-step, resource list,
    downloadable file, custom HTML (sanitised on the site with a strict allow-list).
  - *Information:* info/tip/note/warning/important callouts, comparison, table of
    contents, sources & references.
- **Every block** has move up / move down, duplicate and a two-step remove
  (Remove / Keep; cancels itself after 4 s) in its header, and can be dragged by
  the grip.

### Developer blocks

- **Prompt block:** title, stage (e.g. "Stage 1: Planning"; earlier stages are
  suggested), description, language (plain prompt, Markdown, Bash, JSON, YAML,
  TypeScript, JavaScript, Python, SQL), the prompt itself (whitespace kept
  exactly), how to use, notes, and card / minimal style. Placeholders written as
  UPPERCASE in square brackets (`[PROJECT IDEA]`, `[TASK / FEATURE]`) are listed
  under the prompt; readers get an input for each. Markdown checkboxes and links
  are never treated as variables. *Preview* shows the reader view with a working
  copy button. Prompts are numbered automatically on the site in reading order.
- **Code block:** language, plus *Wrap lines* and *Line numbers* toggles in the
  toolbar while the cursor is in the block.
- **Step-by-step:** numbered steps, each with a title and a body that can hold
  text, code and prompt blocks. *Add step* appends one.
- **Comparison:** 2–4 columns, each with a title, a tone (neutral, pros ✓, cons ✕)
  and one point per line.
- **Resource list:** title, link, description and category per item. Only
  `https://`/`http://` links become links (opened in a new tab, `noopener`).
- **Downloadable file:** PDF, Markdown, TXT, CSV or ZIP up to 25 MB, stored in
  `blog/attachments/`. Executables, HTML/SVG and disguised names such as
  `invoice.exe.pdf` are refused here and by Storage rules.

Older posts load unchanged: prompts that only had a label and text keep working,
and gain the new fields once edited.

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
scheduler publishes it within ~10 minutes of that time (GitHub Actions), and sends incomplete posts back to draft with the
reason shown under Publish.

### Previews

**Preview** saves pending edits, then opens the real article page from the site
at `/preview/:id` (desktop/tablet/mobile widths or a new tab). Links expire after
30 minutes and are never indexed.

## Configuration

`.env.example` lists the Firebase variables and the optional `VITE_SITE_URL`.
The CSP in `public/_headers` allows calling and framing `https://www.saadmaz.com`
and the four embed providers; add your local site origin there if you develop
against the site's `npm run pages:dev`.

## Tests

`npm test` covers: editor round-trips for every block (prompt fields and exact
whitespace, code options, steps with nested prompts, comparison, resources incl.
unsafe links, attachments) and for legacy HTML, prompt variable detection,
attachment validation, the
embed URL allow-list, chart data parsing, autosave (debounce, dedupe, conflicts,
retries, live-post routing, creation), SEO checks and previews, revision diffs,
reading time (shared vectors with the site), redirects, time zones and image
validation.
