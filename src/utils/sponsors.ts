import sponsorsData from '../data/sponsors.json' with { type: 'json' };
import { themeConfig } from '~/theme.config';

export type SponsorPlacement = 'mobile-strip' | 'rail-left' | 'rail-right' | 'course-card';

export interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  cta: string;
  url: string;
}

export const sponsors: Sponsor[] = sponsorsData;

/** Tag a sponsor click. Relative URLs stay relative so local previews work. */
export function sponsorUrl(url: string, placement: SponsorPlacement): string {
  const site = themeConfig.site.replace(/\/$/, '');
  const absolute = new URL(url, site.endsWith('/') ? site : `${site}/`);
  absolute.searchParams.set('utm_medium', 'sponsor');
  absolute.searchParams.set('utm_content', placement);
  if (url.startsWith('/')) {
    return `${absolute.pathname}${absolute.search}`;
  }
  return absolute.toString();
}
