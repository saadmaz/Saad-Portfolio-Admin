import { useCallback, useEffect, useRef, useState } from 'react';
import { BlogService, ConflictError } from '@/services/blog-service';
import type { BlogPost, BlogPostDoc } from '@/types/blog';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline' | 'conflict';

export const AUTOSAVE_DELAY_MS = 2500;
const RETRY_MS = [5_000, 15_000, 30_000, 60_000];
const CHECKPOINT_MS = 10 * 60 * 1000;

/** Device-local backup of unsaved edits, used to recover after a crash or a lost connection. */
export const localBackup = {
  key: (id: string | null) => `blog-draft:${id ?? 'new'}`,
  read(id: string | null): { data: Partial<BlogPost>; at: string } | null {
    try {
      const raw = localStorage.getItem(localBackup.key(id));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(id: string | null, data: Partial<BlogPost>) {
    try {
      localStorage.setItem(localBackup.key(id), JSON.stringify({ data, at: new Date().toISOString() }));
    } catch {
      // Storage full or blocked: the server save still happens.
    }
  },
  clear(id: string | null) {
    try {
      localStorage.removeItem(localBackup.key(id));
    } catch {
      // ignore
    }
  },
};

interface Options {
  postId: string | null;
  data: Partial<BlogPost>;
  /** Published or scheduled: edits go to the autosave doc, never the live post. */
  live: boolean;
  baseRevision: number;
  /** Off until the post has loaded, so loading doesn't count as an edit. */
  enabled: boolean;
  /** A new post only gets created once there's something worth keeping. */
  canCreate: boolean;
  onCreated: (id: string, revision: number) => void;
  onSaved: (revision: number) => void;
  onConflict: (current: BlogPostDoc) => void;
}

/**
 * Debounced autosave with:
 *  - no request when nothing changed since the last save (snapshot compare),
 *  - one request in flight at a time (later edits queue behind it),
 *  - optimistic-concurrency conflicts surfaced instead of overwriting,
 *  - retry with backoff when offline or failing, and immediately on reconnect,
 *  - a device-local backup until the server confirms,
 *  - a revision checkpoint at most every 10 minutes (not every keystroke),
 *  - a flush on unmount and a browser warning before leaving unsaved.
 */
export function useAutosave(opts: Options) {
  const [state, setState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const o = useRef(opts);
  o.current = opts;

  const snapshot = JSON.stringify(opts.data);
  const savedSnapshot = useRef<string | null>(null);
  const revisionRef = useRef(opts.baseRevision);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<number>();
  const retries = useRef(0);
  const lastCheckpoint = useRef(Date.now());
  /** Set synchronously on a conflict; autosave stays paused until it's resolved. */
  const conflicted = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    revisionRef.current = opts.baseRevision;
  }, [opts.baseRevision]);

  /** Marks the current content as saved (after load, publish, restore…). */
  const markSaved = useCallback((data: Partial<BlogPost>) => {
    savedSnapshot.current = JSON.stringify(data);
    setState('saved');
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const { postId, data, live, canCreate } = o.current;
    const current = JSON.stringify(data);
    if (current === savedSnapshot.current || conflicted.current) return;
    if (!postId && !canCreate) return;

    window.clearTimeout(timer.current);
    setState('saving');
    const run = (async () => {
      try {
        if (!postId) {
          const { id, revision } = await BlogService.createDraft(data);
          revisionRef.current = revision;
          localBackup.clear(null);
          o.current.onCreated(id, revision);
        } else if (live) {
          await BlogService.writeAutosave(postId, data, revisionRef.current);
        } else {
          const checkpoint = Date.now() - lastCheckpoint.current > CHECKPOINT_MS;
          const revision = await BlogService.saveDraft(postId, data, revisionRef.current, {
            revisionReason: checkpoint ? 'Autosave checkpoint' : undefined,
          });
          if (checkpoint) lastCheckpoint.current = Date.now();
          revisionRef.current = revision;
          o.current.onSaved(revision);
        }
        savedSnapshot.current = current;
        retries.current = 0;
        localBackup.clear(o.current.postId);
        setLastSavedAt(new Date());
        setState(JSON.stringify(o.current.data) === current ? 'saved' : 'dirty');
      } catch (err) {
        if (err instanceof ConflictError) {
          conflicted.current = true;
          setState('conflict');
          o.current.onConflict(err.current);
          return;
        }
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setState(offline ? 'offline' : 'error');
        const delay = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)];
        retries.current += 1;
        timer.current = window.setTimeout(() => void save(), delay);
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    await run;
    // Edits made while saving get their own save.
    if (JSON.stringify(o.current.data) !== savedSnapshot.current && !conflicted.current) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    }
  }, []);

  // Debounce edits into saves.
  useEffect(() => {
    if (!opts.enabled || conflicted.current) return;
    if (snapshot === savedSnapshot.current) return;
    setState((s) => (s === 'saving' ? s : 'dirty'));
    localBackup.write(o.current.postId, o.current.data);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer.current);
  }, [snapshot, opts.enabled, save]);

  // Retry as soon as the connection comes back.
  useEffect(() => {
    const online = () => {
      if (['offline', 'error', 'dirty'].includes(stateRef.current)) void save();
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [save]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (['dirty', 'saving', 'error', 'offline', 'conflict'].includes(stateRef.current)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  // Navigating away inside the app: save whatever is pending.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (stateRef.current === 'dirty' || stateRef.current === 'error') void save();
    },
    [save],
  );

  const resolveConflict = useCallback((revision: number, data?: Partial<BlogPost>) => {
    conflicted.current = false;
    revisionRef.current = revision;
    if (data) savedSnapshot.current = JSON.stringify(data);
    setState(data ? 'saved' : 'dirty');
  }, []);

  /** The revision the next write will be based on (updated synchronously after each save). */
  const getRevision = useCallback(() => revisionRef.current, []);

  return {
    state,
    lastSavedAt,
    getRevision,
    /** Save now (e.g. before preview); resolves when the server has the latest content. */
    flush: save,
    markSaved,
    resolveConflict,
    hasUnsaved: state === 'dirty' || state === 'saving' || state === 'error' || state === 'offline',
  };
}
