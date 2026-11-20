import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/services/blog-service', () => {
  class ConflictError extends Error {
    constructor(public current: unknown) {
      super('conflict');
    }
  }
  return {
    ConflictError,
    BlogService: { createDraft: vi.fn(), saveDraft: vi.fn(), writeAutosave: vi.fn(), addRevision: vi.fn() },
  };
});

import { BlogService, ConflictError } from '@/services/blog-service';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';
import { GooglePreview, SocialPreviews } from './previews';

const svc = vi.mocked(BlogService);

function setup(initial: Record<string, unknown>, extra: Partial<Parameters<typeof useAutosave>[0]> = {}) {
  const callbacks = { onCreated: vi.fn(), onSaved: vi.fn(), onConflict: vi.fn() };
  const hook = renderHook((props: { data: Record<string, unknown> }) =>
    useAutosave({ postId: 'p1', live: false, baseRevision: 3, enabled: true, canCreate: true, ...callbacks, ...extra, data: props.data }),
  { initialProps: { data: initial } });
  act(() => hook.result.current.markSaved(initial));
  return { ...hook, ...callbacks };
}

const tick = async (ms = AUTOSAVE_DELAY_MS) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('debounces edits into one save with the current revision, then tracks the new one', async () => {
    svc.saveDraft.mockResolvedValue(4);
    const { rerender, result, onSaved } = setup({ title: 'a' });
    rerender({ data: { title: 'ab' } });
    rerender({ data: { title: 'abc' } });
    expect(result.current.state).toBe('dirty');
    await tick(AUTOSAVE_DELAY_MS - 100);
    expect(svc.saveDraft).not.toHaveBeenCalled();
    await tick(200);
    expect(svc.saveDraft).toHaveBeenCalledTimes(1);
    expect(svc.saveDraft).toHaveBeenCalledWith('p1', { title: 'abc' }, 3, { revisionReason: undefined });
    expect(onSaved).toHaveBeenCalledWith(4);
    expect(result.current.state).toBe('saved');
    expect(result.current.getRevision()).toBe(4);
  });

  it('makes no request when content is unchanged', async () => {
    const { rerender, result } = setup({ title: 'same' });
    rerender({ data: { title: 'same' } });
    await tick();
    await act(async () => {
      await result.current.flush();
    });
    expect(svc.saveDraft).not.toHaveBeenCalled();
  });

  it('keeps a device backup until the server confirms', async () => {
    svc.saveDraft.mockReturnValue(new Promise(() => undefined));
    const { rerender } = setup({ title: 'a' });
    rerender({ data: { title: 'unsaved' } });
    expect(JSON.parse(localStorage.getItem('blog-draft:p1')!).data).toEqual({ title: 'unsaved' });
  });

  it('pauses on a conflict instead of overwriting', async () => {
    svc.saveDraft.mockRejectedValue(new ConflictError({ id: 'p1', revision: 9 } as never));
    const { rerender, result, onConflict } = setup({ title: 'a' });
    rerender({ data: { title: 'mine' } });
    await tick();
    expect(result.current.state).toBe('conflict');
    expect(onConflict).toHaveBeenCalledWith({ id: 'p1', revision: 9 });
    rerender({ data: { title: 'mine, more' } });
    await tick(60_000);
    expect(svc.saveDraft).toHaveBeenCalledTimes(1);
  });

  it('retries failed saves with backoff', async () => {
    svc.saveDraft.mockRejectedValueOnce(new Error('network')).mockResolvedValue(4);
    const { rerender, result } = setup({ title: 'a' });
    rerender({ data: { title: 'b' } });
    await tick();
    expect(result.current.state).toBe('error');
    await tick(5_000);
    expect(svc.saveDraft).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe('saved');
  });

  it('never touches a live post: edits go to the autosave document', async () => {
    svc.writeAutosave.mockResolvedValue(undefined);
    const { rerender } = setup({ title: 'live' }, { live: true });
    rerender({ data: { title: 'live edit' } });
    await tick();
    expect(svc.writeAutosave).toHaveBeenCalledWith('p1', { title: 'live edit' }, 3);
    expect(svc.saveDraft).not.toHaveBeenCalled();
  });

  it('creates a new post only once it has a title', async () => {
    svc.createDraft.mockResolvedValue({ id: 'new1', revision: 1 });
    const { rerender, onCreated } = setup({ title: '' }, { postId: null, canCreate: false });
    rerender({ data: { title: '' , content: 'x' } });
    await tick();
    expect(svc.createDraft).not.toHaveBeenCalled();
    const second = setup({ title: '' }, { postId: null, canCreate: true });
    second.rerender({ data: { title: 'Hello' } });
    await tick();
    expect(svc.createDraft).toHaveBeenCalledWith({ title: 'Hello' });
    expect(second.onCreated).toHaveBeenCalledWith('new1', 1);
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe('previews', () => {
  it('warns when the search title and description will be truncated', () => {
    render(<GooglePreview post={{ title: 'x'.repeat(80), excerpt: 'y'.repeat(200), slug: 's' }} />);
    expect(screen.getByText(/Google will cut it off/)).toBeInTheDocument();
    expect(screen.getByText(/will be truncated/)).toBeInTheDocument();
  });

  it('flags a missing description', () => {
    render(<GooglePreview post={{ title: 'A fine title', slug: 's' }} />);
    expect(screen.getByText(/Missing description/)).toBeInTheDocument();
  });

  it('uses the social image, else the cover, else the generated card', () => {
    const { rerender, container } = render(<SocialPreviews post={{ title: 'T', socialImage: { url: 'https://s/social.jpg' }, cover: { url: 'https://s/cover.jpg' } }} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://s/social.jpg');
    rerender(<SocialPreviews post={{ title: 'T', cover: { url: 'https://s/cover.jpg' } }} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://s/cover.jpg');
    expect(screen.getByText(/Using the cover image/)).toBeInTheDocument();
    rerender(<SocialPreviews post={{ title: 'T' }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Generated site card')).toHaveLength(4);
  });
});
