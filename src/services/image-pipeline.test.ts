import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('./storage', () => ({ uploadImageWithPath: vi.fn() }));

import { dimensionWarnings, MAX_BYTES, validateImageFile, variantWidths } from './image-pipeline';

describe('validateImageFile', () => {
  it('accepts supported images under the size limit', () => {
    expect(validateImageFile({ type: 'image/webp', size: 1000 })).toBeNull();
    expect(validateImageFile({ type: 'image/gif', size: MAX_BYTES - 1 })).toBeNull();
  });

  it('rejects other types, oversize and empty files', () => {
    expect(validateImageFile({ type: 'image/svg+xml', size: 10 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'application/pdf', size: 10 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'image/png', size: MAX_BYTES + 1 })).toMatch(/15 MB/);
    expect(validateImageFile({ type: 'image/png', size: 0 })).toMatch(/empty/);
  });
});

describe('variantWidths', () => {
  it('makes standard widths below the original, capped at 1920', () => {
    expect(variantWidths(4000)).toEqual([640, 1280, 1920]);
    expect(variantWidths(1500)).toEqual([640, 1280, 1500]);
    expect(variantWidths(500)).toEqual([500]);
    expect(variantWidths(1280)).toEqual([640, 1280]);
  });
});

describe('dimensionWarnings', () => {
  it('warns about small and badly proportioned social images', () => {
    expect(dimensionWarnings(1200, 630, 'social')).toEqual([]);
    expect(dimensionWarnings(800, 800, 'social')).toHaveLength(2);
    expect(dimensionWarnings(2400, 1200, 'cover')).toEqual([]);
    expect(dimensionWarnings(600, 400, 'cover')).toHaveLength(1);
  });
});
