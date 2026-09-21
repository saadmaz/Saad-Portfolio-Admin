/**
 * services/blog-service.ts
 * ─────────────────────────────────────────────────────────────
 * All blog-post CRUD operations using the Firebase SDK directly.
 *
 * BEFORE: browser → axios → Express (/api/blog-posts) → Firebase Admin → Firestore
 * AFTER:  browser → Firebase SDK → Firestore
 *
 * Security is enforced by Firestore Security Rules:
 *   match /blog_posts/{id} {
 *     allow read: if true;
 *     allow write: if isAdmin();  // saadmazaa@gmail.com only
 *   }
 *
 * Public class API is kept identical - all hooks/pages stay unchanged.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BlogPost } from "@/types";

// ─── Firestore collection name ───────────────────────────────────
const COL = "blog_posts";

export class BlogService {

  // ─── Public reads ───────────────────────────────────────────────

  /**
   * Fetch ALL blog posts (published + drafts).
   * Used in the admin panel to show all entries for management.
   */
  static async getAll(): Promise<BlogPost[]> {
    try {
      const q = query(collection(db, COL), orderBy("date", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogPost));
    } catch (error) {
      console.warn("[BlogService] getAll:", error);
      return [];
    }
  }

  /**
   * Fetch only published posts (published === true).
   * Used on the public /blog page.
   */
  static async getPublished(): Promise<BlogPost[]> {
    const q = query(
      collection(db, COL),
      where("published", "==", true),
      orderBy("date", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogPost));
  }

  /**
   * Fetch the single latest published post.
   * Replaces the old GET /blog-posts/latest endpoint.
   */
  static async getLatest(): Promise<BlogPost | null> {
    const posts = await BlogService.getPublished();
    return posts[0] ?? null;
  }

  /** Fetch one post by its Firestore document ID. */
  static async getById(id: string): Promise<BlogPost | null> {
    try {
      const snap = await getDoc(doc(db, COL, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as BlogPost;
    } catch (error) {
      console.error("[BlogService] getById:", error);
      return null;
    }
  }

  /** Fetch one post by its slug field. Used by /blog/:slug routes. */
  static async getBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const q = query(collection(db, COL), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as BlogPost;
    } catch (error) {
      console.error("[BlogService] getBySlug:", error);
      return null;
    }
  }

  /** Try slug first, fall back to Firestore document ID. */
  static async getBySlugOrId(slugOrId: string): Promise<BlogPost | null> {
    const bySlug = await BlogService.getBySlug(slugOrId);
    if (bySlug) return bySlug;
    return BlogService.getById(slugOrId);
  }

  // ─── Admin writes (require active Firebase Auth session) ────────

  /** Create a new blog post. Firestore auto-generates the document ID. */
  static async create(post: Partial<BlogPost>): Promise<BlogPost> {
    const clean = JSON.parse(JSON.stringify(post));
    const ref = await addDoc(collection(db, COL), {
      ...clean,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { id: ref.id, ...clean } as BlogPost;
  }

  /** Merge-update an existing post. Only changed fields are overwritten. */
  static async update(id: string | number, post: Partial<BlogPost>): Promise<BlogPost> {
    const clean = JSON.parse(JSON.stringify(post));
    await updateDoc(doc(db, COL, String(id)), {
      ...clean,
      updated_at: serverTimestamp(),
    });
    return { id, ...clean } as BlogPost;
  }

  /** Permanently delete a blog post by ID. */
  static async delete(id: string | number): Promise<void> {
    await deleteDoc(doc(db, COL, String(id)));
  }
}
