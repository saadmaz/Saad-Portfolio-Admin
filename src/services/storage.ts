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
export const uploadImage = (
  file: File,
  folder: string = "uploads",
  onProgress?: (pct: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filename  = `${Date.now()}-${file.name}`;
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
          resolve(url);
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
