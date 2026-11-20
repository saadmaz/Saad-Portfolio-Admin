import { browserTimeZone, utcToZonedWallTime } from '@/shared/lib/article';
import type { BlogPost } from '@/types/blog';

export interface ScheduleValue {
  local: string;
  zone: string;
}

/** Schedule picker state for a post: its saved time in its saved zone, or empty in the browser's zone. */
export const scheduleFromPost = (post: Partial<BlogPost>): ScheduleValue => {
  const zone = post.scheduledTimezone || browserTimeZone();
  return { local: post.scheduledAt ? utcToZonedWallTime(post.scheduledAt, zone) : '', zone };
};
