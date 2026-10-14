import rss from '@astrojs/rss';
import { themeConfig } from '~/theme.config';
import { getPublishedLessons, lessonPath } from '@utils/course';

export async function GET(context) {
  const lessons = await getPublishedLessons();
  return rss({
    title: `${themeConfig.name} lessons`,
    description: 'New lessons from the free course for men leaving porn, gaming, the phone, and alcohol.',
    site: context.site,
    trailingSlash: false,
    items: lessons.map((lesson) => ({
      title: lesson.data.title,
      pubDate: lesson.data.publishDate,
      description: lesson.data.description,
      link: lessonPath(lesson.data.track, lesson.id),
    })),
  });
}
