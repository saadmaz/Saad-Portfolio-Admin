/**
 * Firestore access for the blog's supporting collections: authors, series,
 * settings, the 404 log, first-party analytics and the media library.
 * Writes are admin-only (Firestore rules); analytics and the 404 log are
 * written by the public site's serverless functions and only read here.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteImage } from './storage';
import type {
  ArticleStats,
  Author,
  BlogSeries,
  BlogSettings,
  DailyStats,
  MediaAsset,
  NotFoundEntry,
} from '@/types/blog';

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const now = () => new Date().toISOString();

async function all<T>(name: string): Promise<T[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
}

async function save<T extends { id?: string }>(name: string, item: T): Promise<string> {
  const { id, ...data } = item;
  const ref = id ? doc(db, name, id) : doc(collection(db, name));
  await setDoc(ref, { ...clean(data), updatedAt: now(), ...(id ? {} : { createdAt: now() }) }, { merge: true });
  return ref.id;
}

export const AuthorService = {
  getAll: () => all<Author>('authors'),
  save: (a: Partial<Author>) => save('authors', a),
  delete: (id: string) => deleteDoc(doc(db, 'authors', id)),
  /** Makes `id` the default author (used for posts without an authorId). */
  async setDefault(id: string, authors: Author[]) {
    await Promise.all(
      authors.map((a) => (a.id === id || a.isDefault ? setDoc(doc(db, 'authors', a.id), { isDefault: a.id === id }, { merge: true }) : null)),
    );
    await SettingsService.save({ defaultAuthorId: id });
  },
};

export const SeriesService = {
  getAll: () => all<BlogSeries>('blog_series'),
  save: (s: Partial<BlogSeries>) => save('blog_series', s),
  delete: (id: string) => deleteDoc(doc(db, 'blog_series', id)),
};

export const SettingsService = {
  async get(): Promise<BlogSettings> {
    const snap = await getDoc(doc(db, 'blog_settings', 'config'));
    return snap.exists() ? (snap.data() as BlogSettings) : {};
  },
  async save(settings: Partial<BlogSettings>): Promise<void> {
    await setDoc(doc(db, 'blog_settings', 'config'), { ...clean(settings), updatedAt: now() }, { merge: true });
  },
};

export const NotFoundService = {
  async top(n = 200): Promise<NotFoundEntry[]> {
    const snap = await getDocs(query(collection(db, 'not_found'), orderBy('count', 'desc'), limit(n)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as NotFoundEntry);
  },
  dismiss: (id: string) => deleteDoc(doc(db, 'not_found', id)),
};

export const AnalyticsService = {
  /** Lifetime counters for every article that has data. */
  getAll: () => all<ArticleStats>('blog_stats'),
  /** Daily counters for one article since `fromDate` (YYYY-MM-DD). */
  async daily(postId: string, fromDate: string): Promise<DailyStats[]> {
    const snap = await getDocs(
      query(collection(db, 'blog_stats', postId, 'days'), where('date', '>=', fromDate), orderBy('date', 'asc')),
    );
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as DailyStats);
  },
};

export const MediaService = {
  async getAll(): Promise<MediaAsset[]> {
    const snap = await getDocs(query(collection(db, 'media'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MediaAsset);
  },
  save: (m: Partial<MediaAsset> & { id: string }) => save('media', m),
  /** Deletes the library record and every stored rendition. */
  async delete(m: MediaAsset): Promise<void> {
    const paths = m.variantPaths?.length ? m.variantPaths : [m.path];
    await Promise.all(paths.map((p) => deleteImage(p).catch(() => undefined)));
    await deleteDoc(doc(db, 'media', m.id));
  },
};
