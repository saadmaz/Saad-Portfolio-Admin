/**
 * services/project-service.ts
 * ─────────────────────────────────────────────────────────────
 * All project CRUD operations using the Firebase SDK directly.
 *
 * BEFORE: browser → axios → Express (/api/projects) → Firebase Admin → Firestore
 * AFTER:  browser → Firebase SDK → Firestore  (no server hop, no cold start)
 *
 * Security is enforced by Firestore Security Rules:
 *   match /projects/{id} {
 *     allow read: if true;
 *     allow write: if isAdmin();  // saadmazaa@gmail.com only
 *   }
 *
 * The public class API is kept identical so every admin page
 * and hook works without any changes.
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
import type { Project } from "@/types";

// ─── Firestore collection name ───────────────────────────────────
const COL = "projects";

export class ProjectService {

  // ─── Public reads (no auth required) ───────────────────────────

  /**
   * Fetch all projects ordered by order_index ascending.
   * Falls back to empty array on error so pages never crash.
   */
  static async getAll(): Promise<Project[]> {
    try {
      const q = query(collection(db, COL), orderBy("order_index", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
    } catch (error) {
      console.error("[ProjectService] getAll:", error);
      return [];
    }
  }

  /**
   * Fetch only featured projects (featured === true).
   * Used on the homepage hero / featured section.
   */
  static async getFeatured(): Promise<Project[]> {
    try {
      // No orderBy — avoids requiring a composite index on (featured, order_index).
      // Sorting is done client-side in useFeaturedProjects / FeaturedProjects.tsx.
      const q = query(
        collection(db, COL),
        where("featured", "==", true)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
    } catch (error) {
      console.error("[ProjectService] getFeatured:", error);
      return [];
    }
  }

  /** Fetch one project by its Firestore document ID. */
  static async getById(id: string): Promise<Project | null> {
    try {
      const snap = await getDoc(doc(db, COL, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Project;
    } catch (error) {
      console.error("[ProjectService] getById:", error);
      return null;
    }
  }

  /** Fetch one project by its slug field. Used by /projects/:slug routes. */
  static async getBySlug(slug: string): Promise<Project | null> {
    try {
      const q = query(collection(db, COL), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Project;
    } catch (error) {
      console.error("[ProjectService] getBySlug:", error);
      return null;
    }
  }

  // ─── Admin writes (require active Firebase Auth session) ────────

  /**
   * Create a new project document.
   * Firestore auto-generates the document ID.
   * Returns the saved project including the generated ID.
   */
  static async create(project: Partial<Project>): Promise<Project> {
    const clean = JSON.parse(JSON.stringify(project));
    const ref = await addDoc(collection(db, COL), {
      ...clean,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { id: ref.id, ...clean } as Project;
  }

  /**
   * Merge-update an existing project.
   * Only the fields passed in are changed - other fields are preserved.
   */
  static async update(id: string | number, project: Partial<Project>): Promise<Project> {
    const clean = JSON.parse(JSON.stringify(project));
    await updateDoc(doc(db, COL, String(id)), {
      ...clean,
      updated_at: serverTimestamp(),
    });
    return { id, ...clean } as Project;
  }

  /** Permanently delete a project document by ID. */
  static async delete(id: string | number): Promise<void> {
    await deleteDoc(doc(db, COL, String(id)));
  }
}
