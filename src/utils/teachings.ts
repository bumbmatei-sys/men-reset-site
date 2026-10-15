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

export type TeachingCard = {
  href: string;
  title: string;
  excerpt: string;
  category: string;
  date: Date;
  minutes: number;
  image: { src: string; alt: string };
};

export const toCard = (e: TeachingEntry): TeachingCard => ({
  href: teachingPath(e),
  title: e.data.title,
  excerpt: e.data.description,
  category: e.data.category,
  date: e.data.updatedDate ?? e.data.publishDate,
  minutes: e.data.readingTime,
  image: e.data.image,
});

/** Preview-only sample cards (BLOG_PREVIEW=1) so the editorial layout can be reviewed before real posts exist. */
export function previewSamples(href: string): TeachingCard[] {
  const s = (title: string, category: string, date: string, minutes: number, src: string, alt: string, excerpt: string): TeachingCard => ({ href, title, category, date: new Date(date), minutes, image: { src, alt }, excerpt });
  return [
    s('Identity in Christ: Who You Are After You Fall', 'Identity', '2026-10-12', 6, '/images/teachings/identity-in-christ.webp', 'Classical marble scene in golden light', 'Sample card. Shame says you are what you did. Scripture says something else, and it changes how you fight.'),
    s('A Morning Routine That Holds Under Pressure', 'Discipline', '2026-10-09', 5, '/aureum/hero-landscape.webp', 'A path leading to a marble temple on a hill', 'Sample card. Five small things before your phone, every day, for thirty days.'),
    s('Why You Keep Going Back, and How to Stop', 'Break free', '2026-10-06', 8, '/aureum/temple.webp', 'Marble armillary sphere above golden hills', 'Sample card. The cycle has a shape. Once you can name it, you can break it early.'),
    s('Quit Gaming Without Losing Your Friends', 'Discipline', '2026-10-02', 6, '/aureum/problem.webp', 'Classical marble figures', 'Sample card. What to do with the hours you get back, and who to spend them with.'),
    s('Grace Is Not a Loophole', 'Faith', '2026-09-28', 7, '/aureum/process-02.webp', 'Classical marble scene', 'Sample card. Grace does not excuse the habit. It removes the shame that feeds it.'),
    s('Stand Up: Leading at Home When You Feel Unqualified', 'Manhood', '2026-09-24', 9, '/aureum/process-03.webp', 'Classical marble scene', 'Sample card. You do not need to feel ready to take the first step of leadership.'),
  ];
}
