import { getTracks, lessonsForTrack, lessonPath } from '@utils/course';
import { getTeachings, teachingPath } from '@utils/teachings';

export type RelatedItem = {
  href: string;
  title: string;
  description: string;
  kind: 'Lesson' | 'Teaching';
  group: string;
  groupTitle: string;
  text: string;
};

const STOP = new Set(
  'a an and are as at be because but by can do does for from get go has have he her him his how i if in into is it its just like me more my no not of on one or our out so than that the their them then there they this to up was we what when where who why will with you your yours yourself again every off only own same very too also about after before over under through still even all any each few most other some such ever never'.split(' '),
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word))
      .map((word) => word.replace(/(ing|ed|es|s)$/, '')),
  );
}

let cache: RelatedItem[] | null = null;

/** Every published lesson (open tracks, not the 30-day plan phases) and every teaching. */
export async function allReadable(): Promise<RelatedItem[]> {
  if (cache) return cache;
  const items: RelatedItem[] = [];
  for (const track of await getTracks()) {
    if (track.data.status !== 'available') continue;
    for (const lesson of await lessonsForTrack(track.id)) {
      items.push({
        href: lessonPath(track.id, lesson.id),
        title: lesson.data.title,
        description: lesson.data.description,
        kind: 'Lesson',
        group: track.id,
        groupTitle: track.data.title,
        text: [lesson.data.title, lesson.data.description, lesson.data.targetQuery, ...lesson.data.keyPoints].join(' '),
      });
    }
  }
  for (const teaching of await getTeachings()) {
    if (teaching.data.draft) continue;
    items.push({
      href: teachingPath(teaching),
      title: teaching.data.title,
      description: teaching.data.description,
      kind: 'Teaching',
      group: 'teachings',
      groupTitle: 'Teachings',
      text: [teaching.data.title, teaching.data.description, ...teaching.data.takeaways].join(' '),
    });
  }
  cache = items;
  return items;
}

/**
 * Picks related reading by word overlap of title, description and key points.
 * Same track counts a little extra. At most two from one group, so the list mixes lessons and teachings.
 */
export async function relatedFor(opts: { href: string; group: string; text: string; exclude?: string[]; limit?: number }): Promise<RelatedItem[]> {
  const { href, group, text, exclude = [], limit = 3 } = opts;
  const mine = tokens(text);
  const skip = new Set([href, ...exclude]);
  const scored = (await allReadable())
    .filter((item) => !skip.has(item.href))
    .map((item) => {
      const theirs = tokens(item.text);
      let shared = 0;
      for (const word of theirs) if (mine.has(word)) shared += 1;
      const score = shared / Math.sqrt(Math.max(1, mine.size) * Math.max(1, theirs.size)) + (item.group === group ? 0.05 : 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  const picked: RelatedItem[] = [];
  const perGroup = new Map<string, number>();
  for (const { item } of scored) {
    const count = perGroup.get(item.group) ?? 0;
    if (count >= 2) continue;
    picked.push(item);
    perGroup.set(item.group, count + 1);
    if (picked.length >= limit) break;
  }
  return picked;
}
