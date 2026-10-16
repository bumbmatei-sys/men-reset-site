import { getCollection, type CollectionEntry } from 'astro:content';

export type TrackEntry = CollectionEntry<'tracks'>;
export type LessonEntry = CollectionEntry<'lessons'>;

/** Draft tracks and lessons only build for preview deploys (BLOG_PREVIEW=1). */
const isPreview = () => process.env.BLOG_PREVIEW === '1';

export async function getTracks(): Promise<TrackEntry[]> {
  const tracks = await getCollection('tracks', ({ data }) => isPreview() || data.draft !== true);
  return tracks.sort((a, b) => a.data.order - b.data.order);
}

/** 30-day plan pages. They stay reachable, and they stay out of the Break Free lesson count. */
export const PLAN_PHASE_IDS = [
  'identity-and-a-clean-slate',
  'dismantling-triggers',
  'activating-faith',
  'lasting-freedom',
] as const;

const planPhaseIds = new Set<string>(PLAN_PHASE_IDS);

export function isPlanPhase(lessonId: string): boolean {
  return planPhaseIds.has(lessonId);
}

export async function getPublishedLessons(): Promise<LessonEntry[]> {
  const lessons = await getCollection('lessons', ({ data }) => isPreview() || data.draft !== true);
  return lessons.sort((a, b) => a.data.order - b.data.order);
}

export async function lessonsForTrack(trackId: string): Promise<LessonEntry[]> {
  const lessons = await getPublishedLessons();
  return lessons.filter((lesson) => lesson.data.track === trackId && !planPhaseIds.has(lesson.id));
}

export async function planPhaseLessons(): Promise<LessonEntry[]> {
  const lessons = await getPublishedLessons();
  return PLAN_PHASE_IDS.flatMap((id) => {
    const lesson = lessons.find((item) => item.id === id);
    return lesson ? [lesson] : [];
  });
}

export function lessonPath(trackId: string, lessonId: string): string {
  return `/tracks/${trackId}/${lessonId}`;
}

export function trackPath(trackId: string): string {
  return `/tracks/${trackId}`;
}
