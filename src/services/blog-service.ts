/**
 * services/blog-service.ts
 * ─────────────────────────────────────────────────────────────
 * Blog CRUD and the editorial workflow, straight to Firestore (rules allow
 * writes only for the admin account).
 *
 * Concurrency: every post carries a `revision` counter. Writes run in a
 * transaction that checks the revision the editor started from; if another
 * tab or device saved in between, a ConflictError is thrown instead of
 * silently overwriting newer content.
 *
 * Live posts are never changed by autosave: edits to a published or
 * scheduled post autosave to blog_autosaves/{id} and only reach the site
 * when the author clicks Update (or the schedule fires).
 */

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  isMeaningfulChange,
  normalizePath,
  planSlugRedirect,
  publishBlockers,
  snapshotOf,
  statusOf,
} from '@/shared/lib/article';
import type { ArticleStatus, Autosave, BlogPost, BlogPostDoc, Redirect, Revision } from '@/types/blog';

const COL = 'blog_posts';
const AUTOSAVES = 'blog_autosaves';
const REDIRECTS = 'redirects';

/** Thrown when the post changed since the editor loaded it. */
export class ConflictError extends Error {
  constructor(public readonly current: BlogPostDoc) {
    super('This post was changed in another tab or device since you opened it.');
    this.name = 'ConflictError';
  }
}

/** Thrown when a post isn't ready to go live; `issues` lists what's missing. */
export class PublishValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Not ready to publish: ${issues.join('; ')}.`);
    this.name = 'PublishValidationError';
  }
}

/** Firestore rejects `undefined`; strip it (null is fine and means "cleared"). */
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Editor data → Firestore update: a top-level key set to `undefined` (or
 * null) means "cleared", so it's deleted rather than silently kept.
 */
export function toPatch(data: Partial<BlogPost>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) patch[k] = v === undefined || v === null ? deleteField() : clean(v);
  return patch;
}
const toPost = (id: string, data: DocumentData) => ({ ...data, id }) as BlogPostDoc;
const editor = () => auth.currentUser?.email ?? 'admin';
const now = () => new Date().toISOString();

export type Transition = 'publish' | 'update' | 'schedule' | 'unschedule' | 'unpublish' | 'archive' | 'review' | 'draft';

const REASONS: Record<Transition, string> = {
  publish: 'Published',
  update: 'Updated live article',
  schedule: 'Scheduled',
  unschedule: 'Unscheduled',
  unpublish: 'Unpublished',
  archive: 'Archived',
  review: 'Sent to review',
  draft: 'Moved to drafts',
};

export class BlogService {
  // ─── Reads ──────────────────────────────────────────────────────

  /** Every post (any status), newest first. */
  static async getAll(): Promise<BlogPostDoc[]> {
    const snap = await getDocs(query(collection(db, COL), orderBy('date', 'desc')));
    return snap.docs.map((d) => toPost(d.id, d.data()));
  }

  static async getById(id: string): Promise<BlogPostDoc | null> {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toPost(snap.id, snap.data()) : null;
  }

  /** True when another post already uses `slug` (or used it while live). */
  static async isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const snap = await getDocs(query(collection(db, COL), where('slug', '==', slug)));
    return snap.docs.some((d) => d.id !== exceptId);
  }

  // ─── Draft writes ───────────────────────────────────────────────

  /** Creates a new draft and returns its id and starting revision. */
  static async createDraft(data: Partial<BlogPost>): Promise<{ id: string; revision: number }> {
    const ref = doc(collection(db, COL));
    await setDoc(ref, {
      ...clean(data),
      status: 'draft',
      published: false,
      date: data.date ?? now(),
      revision: 1,
      editedAt: now(),
      editedBy: editor(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { id: ref.id, revision: 1 };
  }

  /**
   * Saves edits to a post that isn't live (draft, in review, archived).
   * Returns the new revision. Throws ConflictError on a stale base revision.
   */
  static async saveDraft(
    id: string,
    data: Partial<BlogPost>,
    baseRevision: number,
    { revisionReason }: { revisionReason?: string } = {},
  ): Promise<number> {
    const ref = doc(db, COL, id);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('This post no longer exists.');
      const current = toPost(id, snap.data());
      if ((current.revision ?? 0) !== baseRevision) throw new ConflictError(current);
      if (current.published) throw new Error('This post is live; use Update to change it.');
      const revision = baseRevision + 1;
      tx.update(ref, {
        ...toPatch(data),
        revision,
        editedAt: now(),
        editedBy: editor(),
        updated_at: serverTimestamp(),
      });
      if (revisionReason) tx.set(doc(collection(ref, 'revisions')), revisionDoc(current, revisionReason, baseRevision));
      return revision;
    });
  }

  // ─── Autosave for live posts ────────────────────────────────────

  static async getAutosave(id: string): Promise<Autosave | null> {
    const snap = await getDoc(doc(db, AUTOSAVES, id));
    return snap.exists() ? ({ ...snap.data(), id } as Autosave) : null;
  }

  static async writeAutosave(id: string, data: Partial<BlogPost>, baseRevision: number): Promise<void> {
    // Cleared fields are kept as null so restoring the autosave clears them too.
    const withNulls = JSON.parse(JSON.stringify(data, (_k, v) => (v === undefined ? null : v)));
    await setDoc(doc(db, AUTOSAVES, id), { data: withNulls, savedAt: now(), baseRevision });
  }

  static async discardAutosave(id: string): Promise<void> {
    await deleteDoc(doc(db, AUTOSAVES, id));
  }

  // ─── Workflow ───────────────────────────────────────────────────

  /**
   * Applies the editor's `data` and moves the post through the workflow in
   * one transaction (with a revision snapshot), then handles redirects if a
   * live article's URL changed. Returns the saved post.
   */
  static async transition(
    id: string,
    action: Transition,
    data: Partial<BlogPost>,
    baseRevision: number,
    opts: { scheduledAt?: string; scheduledTimezone?: string } = {},
  ): Promise<BlogPostDoc> {
    const goingLive = action === 'publish' || action === 'update';
    if (goingLive || action === 'schedule') {
      const issues = publishBlockers(data);
      if (data.slug && (await BlogService.isSlugTaken(data.slug, id))) issues.push(`The slug “${data.slug}” is used by another post`);
      if (action === 'schedule') {
        const at = Date.parse(opts.scheduledAt ?? '');
        if (Number.isNaN(at)) issues.push('Pick a publish date and time');
        else if (at <= Date.now()) issues.push('The publish time must be in the future');
      }
      if (issues.length) throw new PublishValidationError(issues);
    }

    const ref = doc(db, COL, id);
    // Set inside the transaction; a holder object keeps TypeScript's narrowing honest.
    const moved: { slug: { from: string; to: string } | null } = { slug: null };
    const saved = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('This post no longer exists.');
      const current = toPost(id, snap.data());
      if ((current.revision ?? 0) !== baseRevision) throw new ConflictError(current);

      const stamp = now();
      const firstPublication = !current.publishedAt;
      // Workflow fields, kept apart from the editor's data so the result below is clean.
      const meta: Record<string, unknown> = {};
      const set = (status: ArticleStatus, published: boolean) => Object.assign(meta, { status, published });

      switch (action) {
        case 'publish':
        case 'update': {
          set('published', true);
          meta.publishedAt = current.publishedAt ?? stamp;
          // The publication date is fixed at first publication; edits never move it.
          meta.date = firstPublication ? stamp : current.date;
          meta.lastUpdatedAt = firstPublication
            ? stamp
            : isMeaningfulChange(current, data)
              ? stamp
              : (current.lastUpdatedAt ?? current.publishedAt);
          meta.publishedSlug = data.slug ?? current.slug;
          meta.scheduledAt = null;
          meta.scheduleError = null;
          const liveSlug = current.publishedSlug ?? (current.published ? current.slug : undefined);
          if (liveSlug && data.slug && liveSlug !== data.slug)
            moved.slug = { from: `/blog/${liveSlug}`, to: `/blog/${data.slug}` };
          break;
        }
        case 'schedule':
          if (current.published) throw new Error('Unpublish this post before scheduling it.');
          set('scheduled', false);
          meta.scheduledAt = new Date(opts.scheduledAt!).toISOString();
          meta.scheduledTimezone = opts.scheduledTimezone ?? null;
          meta.scheduleError = null;
          meta.scheduleAttempts = 0;
          // Scheduling an unpublished post is a relaunch: the scheduled time becomes its
          // publication date (the scheduler only sets the date when publishedAt is empty).
          meta.publishedAt = null;
          meta.date = null;
          meta.lastUpdatedAt = null;
          break;
        case 'unschedule':
        case 'draft':
          set('draft', false);
          meta.scheduledAt = null;
          break;
        case 'unpublish':
          set('draft', false);
          break;
        case 'archive':
          set('archived', false);
          meta.featured = false;
          meta.scheduledAt = null;
          break;
        case 'review':
          set('in_review', false);
          break;
      }

      const revision = baseRevision + 1;
      Object.assign(meta, { revision, editedAt: stamp, editedBy: editor() });
      tx.update(ref, { ...toPatch(data), ...meta, updated_at: serverTimestamp() });
      tx.set(doc(collection(ref, 'revisions')), revisionDoc({ ...current, ...data }, REASONS[action], revision));
      // Pending autosaved edits are now either applied or superseded.
      tx.delete(doc(db, AUTOSAVES, id));
      return toPost(id, { ...current, ...data, ...meta });
    });

    if (moved.slug) await RedirectService.applySlugMove(moved.slug.from, moved.slug.to);
    return saved;
  }

  // ─── Revisions ──────────────────────────────────────────────────

  static async listRevisions(id: string): Promise<Revision[]> {
    const snap = await getDocs(query(collection(db, COL, id, 'revisions'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Revision);
  }

  /** Records a snapshot of `post` (e.g. a manual checkpoint, or "before restore"). */
  static async addRevision(id: string, post: Partial<BlogPost>, reason: string): Promise<void> {
    await setDoc(doc(collection(db, COL, id, 'revisions')), revisionDoc(post, reason, post.revision));
  }

  // ─── Featured ───────────────────────────────────────────────────

  /** Sets featured flags and order in one batch: `orderedIds` are featured in that order. */
  static async setFeatured(orderedIds: string[], unfeatureIds: string[] = []): Promise<void> {
    const batch = writeBatch(db);
    orderedIds.forEach((id, i) => batch.update(doc(db, COL, id), { featured: true, featuredOrder: i + 1 }));
    unfeatureIds.forEach((id) => batch.update(doc(db, COL, id), { featured: false, featuredOrder: null }));
    await batch.commit();
  }

  // ─── Delete ─────────────────────────────────────────────────────

  /** Deletes a post with its revisions and autosave. */
  static async delete(id: string | number): Promise<void> {
    const key = String(id);
    const revisions = await getDocs(collection(db, COL, key, 'revisions'));
    const batch = writeBatch(db);
    revisions.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, AUTOSAVES, key));
    batch.delete(doc(db, COL, key));
    await batch.commit();
  }

  /** Legacy partial update kept for list-page toggles that don't touch content. */
  static async patch(id: string, data: Partial<BlogPost>): Promise<void> {
    const ref = doc(db, COL, id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('This post no longer exists.');
      tx.update(ref, { ...clean(data), revision: (snap.data().revision ?? 0) + 1, editedAt: now(), editedBy: editor() });
    });
  }
}

function revisionDoc(post: Partial<BlogPost>, reason: string, revision?: number): Omit<Revision, 'id'> {
  return clean({ createdAt: now(), by: editor(), reason, revision, snapshot: snapshotOf(post) });
}

export { statusOf };

// ─── Redirects ────────────────────────────────────────────────────

export const RedirectService = {
  async getAll(): Promise<Redirect[]> {
    const snap = await getDocs(collection(db, REDIRECTS));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Redirect);
  },

  async create(r: Omit<Redirect, 'id'>): Promise<void> {
    await setDoc(doc(collection(db, REDIRECTS)), {
      ...r,
      from: normalizePath(r.from),
      to: /^https?:\/\//i.test(r.to) ? r.to.trim() : normalizePath(r.to),
      createdAt: now(),
    });
  },

  async update(id: string, r: Partial<Omit<Redirect, 'id'>>): Promise<void> {
    const patch: Record<string, unknown> = { ...r, updatedAt: now() };
    if (r.from) patch.from = normalizePath(r.from);
    if (r.to) patch.to = /^https?:\/\//i.test(r.to) ? r.to.trim() : normalizePath(r.to);
    await setDoc(doc(db, REDIRECTS, id), patch, { merge: true });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, REDIRECTS, id));
  },

  /** Redirects a live article's old URL to its new one, collapsing chains (no loops). */
  async applySlugMove(from: string, to: string): Promise<void> {
    const existing = await RedirectService.getAll();
    const plan = planSlugRedirect(existing, from, to);
    const batch = writeBatch(db);
    plan.remove.forEach((rid) => batch.delete(doc(db, REDIRECTS, rid)));
    plan.repoint.forEach((r) => batch.update(doc(db, REDIRECTS, r.id), { to: r.to, updatedAt: now() }));
    if (plan.create) batch.set(doc(collection(db, REDIRECTS)), { ...plan.create, source: 'auto', createdAt: now() });
    await batch.commit();
  },
};
