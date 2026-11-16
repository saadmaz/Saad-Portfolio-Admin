/**
 * Shared class strings for collection list pages, so every list row shares the
 * same card, icon tile, type scale and loading skeleton.
 */

/** List-row card. Not clickable itself, so no pointer cursor; `group` drives RowActions reveal. */
export const ROW_CARD = 'group transition-colors hover:border-border';

/** Square icon tile at the start of a row. */
export const ICON_TILE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-secondary text-fg-2 [&_svg]:h-5 [&_svg]:w-5';

/** Primary line of a row. */
export const ROW_TITLE = 'text-[15px] font-medium leading-snug text-foreground';

/** Secondary meta line(s) under the title. */
export const ROW_META = 'text-[13px] text-muted-foreground';

/** Loading placeholder matching ROW_CARD's shape. Set the height per page. */
export const SKELETON = 'w-full animate-pulse rounded-xl border border-border-subtle bg-card';
