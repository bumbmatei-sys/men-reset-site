import { getCollection, type CollectionEntry } from 'astro:content';

export type TeachingEntry = CollectionEntry<'teachings'>;

/** Draft teachings are only built for preview deploys (BLOG_PREVIEW=1), never for production. */
export const isBlogPreview = () => process.env.BLOG_PREVIEW === '1';

export async function getTeachings(): Promise<TeachingEntry[]> {
  const preview = isBlogPreview();
  const all = await getCollection('teachings', ({ data }) => preview || !data.draft);
  return all.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

export const teachingPath = (entry: TeachingEntry) => `/teachings/${entry.data.slug}`;

export const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
