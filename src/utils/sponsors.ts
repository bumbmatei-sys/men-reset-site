import sponsorsData from '../data/sponsors.json' with { type: 'json' };
import { themeConfig } from '~/theme.config';

export type SponsorTier = 'directory' | 'premium';
export type SponsorPlacement = 'mobile-strip' | 'rail-left' | 'rail-right' | 'directory';

export interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  cta: string;
  url: string;
  tier: SponsorTier;
  logo?: string;
  /** Restricts the sponsor to these placements. Omitted means every placement its tier allows. */
  placements?: SponsorPlacement[];
}

function isTier(value: string): value is SponsorTier {
  return value === 'directory' || value === 'premium';
}

const placements: SponsorPlacement[] = ['mobile-strip', 'rail-left', 'rail-right', 'directory'];

function isPlacement(value: string): value is SponsorPlacement {
  return (placements as string[]).includes(value);
}

export const sponsors: Sponsor[] = sponsorsData.flatMap((entry) => {
  if (!isTier(entry.tier)) return [];
  const sponsor: Sponsor = {
    id: entry.id,
    name: entry.name,
    tagline: entry.tagline,
    cta: entry.cta,
    url: entry.url,
    tier: entry.tier,
  };
  if ('logo' in entry && typeof entry.logo === 'string' && entry.logo.startsWith('/')) sponsor.logo = entry.logo;
  if ('placements' in entry && Array.isArray(entry.placements)) {
    const allowed = entry.placements.filter((value): value is SponsorPlacement => typeof value === 'string' && isPlacement(value));
    if (allowed.length > 0) sponsor.placements = allowed;
  }
  return [sponsor];
});

/** Directory lists every tier. The mobile strip and the left rail are the side-slot tier only. */
export function tierAllows(tier: SponsorTier, placement: SponsorPlacement): boolean {
  if (placement === 'directory') return true;
  return tier === 'premium';
}

export function sponsorsForPlacement(placement: SponsorPlacement): Sponsor[] {
  return sponsors.filter(
    (sponsor) =>
      tierAllows(sponsor.tier, placement) &&
      (!sponsor.placements || sponsor.placements.includes(placement)),
  );
}

export function tierLabel(tier: SponsorTier): string {
  return themeConfig.sponsorTiers.find((tierConfig) => tierConfig.id === tier)?.name ?? tier;
}

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
