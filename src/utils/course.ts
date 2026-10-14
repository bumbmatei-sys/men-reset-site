import { getCollection, type CollectionEntry } from 'astro:content';

export type TrackEntry = CollectionEntry<'tracks'>;
export type LessonEntry = CollectionEntry<'lessons'>;

export async function getTracks(): Promise<TrackEntry[]> {
  const tracks = await getCollection('tracks');
  return tracks.sort((a, b) => a.data.order - b.data.order);
}

export async function getPublishedLessons(): Promise<LessonEntry[]> {
  const lessons = await getCollection('lessons', ({ data }) => data.draft !== true);
  return lessons.sort((a, b) => a.data.order - b.data.order);
}

export async function lessonsForTrack(trackId: string): Promise<LessonEntry[]> {
  const lessons = await getPublishedLessons();
  return lessons.filter((lesson) => lesson.data.track === trackId);
}

export function lessonPath(trackId: string, lessonId: string): string {
  return `/tracks/${trackId}/${lessonId}`;
}

export function trackPath(trackId: string): string {
  return `/tracks/${trackId}`;
}
