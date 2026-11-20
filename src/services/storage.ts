import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from "firebase/storage";
import app from "@/lib/firebase";

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage with real progress callbacks and a
 * 60-second timeout.  Uses uploadBytesResumable (not uploadBytes) so that:
 *   • progress is visible
 *   • the upload can be cancelled on timeout
 *   • errors are surfaced immediately rather than hanging forever
 */
/** "48th Big Debate!" → "48th-big-debate" (URL- and image-search-friendly). */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Storage file name. Google reads image file names, so prefer a descriptive
 * hint (e.g. the event title) over camera names like "IMG_4521". The short
 * timestamp keeps names unique.
 */
const storageName = (file: File, nameHint?: string) => {
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "jpg";
  const base = slugify(nameHint ?? "") || slugify(dot > 0 ? file.name.slice(0, dot) : file.name) || "image";
  return `${base}-${Date.now().toString(36)}.${ext}`;
};

export const uploadImage = (
  file: File,
  folder: string = "uploads",
  onProgress?: (pct: number) => void,
  nameHint?: string
): Promise<string> => uploadImageWithPath(file, folder, onProgress, nameHint).then((r) => r.url);

/** Same as uploadImage, also returning the storage path (needed to delete the object later). */
export const uploadImageWithPath = (
  file: File,
  folder: string = "uploads",
  onProgress?: (pct: number) => void,
  nameHint?: string
): Promise<{ url: string; path: string }> => {
  return new Promise((resolve, reject) => {
    const filename  = storageName(file, nameHint);
    const storageRef = ref(storage, `${folder}/${filename}`);

    const task: UploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    // Hard timeout - cancel the task and reject if it takes > 60 s
    const timer = setTimeout(() => {
      task.cancel();
      reject(new Error("Upload timed out. Check Firebase Storage rules and your internet connection."));
    }, 60_000);

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(pct);
      },
      (error) => {
        clearTimeout(timer);
        // Map Firebase Storage error codes to friendly messages
        switch (error.code) {
          case "storage/unauthorized":
            reject(new Error("Permission denied. Make sure you are logged in and Firebase Storage rules allow writes."));
            break;
          case "storage/canceled":
            reject(new Error("Upload was cancelled."));
            break;
          case "storage/unknown":
            reject(new Error("Upload failed (unknown error). Check your Firebase Storage CORS configuration."));
            break;
          default:
            reject(new Error(`Upload failed: ${error.message}`));
        }
      },
      async () => {
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path: task.snapshot.ref.fullPath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};

export const deleteImage = async (url: string): Promise<void> => {
  let storagePath: string;
  if (url.startsWith("https://")) {
    // Extract encoded path from download URL: .../o/<path>?alt=media&token=...
    const match = url.match(/\/o\/(.+?)(?:\?|$)/);
    if (!match) throw new Error("Invalid Firebase Storage URL");
    storagePath = decodeURIComponent(match[1]);
  } else {
    storagePath = url;
  }
  await deleteObject(ref(storage, storagePath));
};
