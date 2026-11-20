/**
 * Image pipeline for blog media.
 *
 * Validates type and size, reads the real dimensions, and makes WebP
 * renditions at standard widths in the browser before upload, so the site
 * can serve responsive `srcset`s without a server-side image service. Large
 * originals are never stored: the biggest rendition becomes the main URL.
 * GIFs (possibly animated) are uploaded untouched. Browsers that can't
 * encode WebP fall back to uploading the original file. Social images are
 * the exception: a single 1200px-wide JPEG, the format every link-preview
 * crawler (LinkedIn included) renders.
 *
 * Each upload is registered in the `media` collection (the media library).
 */

import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImageWithPath } from './storage';
import type { ImageAsset, ImageVariant } from '@/types/blog';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');
export const MAX_BYTES = 15 * 1024 * 1024;
export const VARIANT_WIDTHS = [640, 1280, 1920] as const;
const WEBP_QUALITY = 0.82;
/** Social cards: LinkedIn and some chat apps don't render WebP link previews, so these are JPEG. */
export const SOCIAL_WIDTH = 1200;
const JPEG_QUALITY = 0.9;

export type ImagePurpose = 'cover' | 'social' | 'inline' | 'avatar';

/** Minimum sensible sizes per use; smaller images still upload, with a warning. */
export const MIN_DIMENSIONS: Record<ImagePurpose, { width: number; height: number }> = {
  cover: { width: 1200, height: 600 },
  social: { width: 1200, height: 630 },
  inline: { width: 600, height: 1 },
  avatar: { width: 200, height: 200 },
};

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type))
    return 'Use a JPG, PNG, WebP, AVIF or GIF image.';
  if (file.size > MAX_BYTES) return `Images must be under ${MAX_BYTES / 1024 / 1024} MB.`;
  if (file.size === 0) return 'This file is empty.';
  return null;
}

/** Warnings (not errors) about an image's dimensions for its intended use. */
export function dimensionWarnings(width: number, height: number, purpose: ImagePurpose): string[] {
  const min = MIN_DIMENSIONS[purpose];
  const out: string[] = [];
  if (width < min.width || height < min.height)
    out.push(`Smaller than the recommended ${min.width}×${min.height}; it may look soft.`);
  if (purpose === 'social') {
    const ratio = width / height;
    if (Math.abs(ratio - 1.91) > 0.15) out.push('Social cards are 1.91:1 (e.g. 1200×630); this will be cropped.');
  }
  return out;
}

/** Renditions to make: the standard widths below the original, plus the original width if smaller. */
export function variantWidths(naturalWidth: number, targets: readonly number[] = VARIANT_WIDTHS): number[] {
  const below = targets.filter((w) => w < naturalWidth);
  const top = Math.min(naturalWidth, targets[targets.length - 1]);
  return [...new Set([...below, top])].sort((a, b) => a - b);
}

async function decode(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

async function encode(bitmap: ImageBitmap, width: number, type: 'image/webp' | 'image/jpeg'): Promise<Blob | null> {
  const height = Math.round((bitmap.height / bitmap.width) * width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  if (type === 'image/jpeg') {
    // JPEG has no alpha: flatten transparent areas onto white, not black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === 'image/jpeg' ? JPEG_QUALITY : WEBP_QUALITY),
  );
  // Safari < 16 silently returns PNG when it can't encode WebP.
  return blob && blob.type === type ? blob : null;
}

export interface UploadResult {
  asset: ImageAsset;
  warnings: string[];
}

/**
 * Validates, optimises and uploads an image. `folder` should live under
 * `blog/` (Storage rules restrict that folder to images under 15 MB).
 */
export async function processAndUpload(
  file: File,
  { folder, purpose, nameHint, onProgress }: { folder: string; purpose: ImagePurpose; nameHint?: string; onProgress?: (pct: number) => void },
): Promise<UploadResult> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const bitmap = await decode(file).catch(() => {
    throw new Error('This image could not be read. It may be corrupt or in an unsupported format.');
  });
  const { width, height } = bitmap;
  const warnings = dimensionWarnings(width, height, purpose);
  const hint = nameHint || file.name.replace(/\.[^.]+$/, '');

  try {
    let variants: { blob: Blob; width: number }[] = [];
    if (file.type !== 'image/gif') {
      // Social images are only used as link-preview cards: one JPEG at card width.
      const social = purpose === 'social';
      const widths = social ? [Math.min(width, SOCIAL_WIDTH)] : variantWidths(width);
      for (const w of widths) {
        const blob = await encode(bitmap, w, social ? 'image/jpeg' : 'image/webp');
        if (!blob) {
          variants = [];
          break;
        }
        variants.push({ blob, width: w });
      }
    }

    // Upload renditions (or the original when we couldn't make any).
    const uploads = variants.length ? variants : [{ blob: file as Blob, width }];
    const total = uploads.reduce((n, u) => n + u.blob.size, 0);
    let done = 0;
    const uploaded: (ImageVariant & { path: string })[] = [];
    for (const u of uploads) {
      const ext =
        u.blob.type === 'image/webp' ? 'webp' : u.blob.type === 'image/jpeg' && variants.length ? 'jpg' : file.name.split('.').pop() || 'jpg';
      const named = new File([u.blob], `${hint}-${u.width}w.${ext}`, { type: u.blob.type || file.type });
      const { url, path } = await uploadImageWithPath(
        named,
        folder,
        (pct) => onProgress?.(Math.round(((done + (u.blob.size * pct) / 100) / total) * 100)),
        `${hint}-${u.width}w`,
      );
      done += u.blob.size;
      uploaded.push({ url, width: u.width, path });
    }

    const main = uploaded[uploaded.length - 1];
    const mainHeight = Math.round((height / width) * main.width);
    const asset: ImageAsset = {
      url: main.url,
      width: main.width,
      height: mainHeight,
      ...(uploaded.length > 1 ? { variants: uploaded.map(({ url, width: w }) => ({ url, width: w })) } : {}),
    };

    // Media library record. Failure here shouldn't lose a successful upload.
    await addDoc(collection(db, 'media'), {
      ...asset,
      path: main.path,
      variantPaths: uploaded.map((u) => u.path),
      bytes: total,
      type: variants.length ? variants[0].blob.type : file.type,
      name: file.name,
      createdAt: new Date().toISOString(),
    }).catch(() => undefined);

    return { asset, warnings };
  } finally {
    bitmap.close();
  }
}
