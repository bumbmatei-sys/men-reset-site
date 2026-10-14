import sponsorsData from '../data/sponsors.json' with { type: 'json' };
import { themeConfig } from '~/theme.config';

export type SponsorTier = 'directory' | 'affiliate' | 'premium';
export type SponsorPlacement = 'mobile-strip' | 'rail-left' | 'rail-right' | 'course-card' | 'directory';

export interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  cta: string;
  url: string;
  tier: SponsorTier;
}

function isTier(value: string): value is SponsorTier {
  return value === 'directory' || value === 'affiliate' || value === 'premium';
}

export const sponsors: Sponsor[] = sponsorsData.flatMap((entry) => (isTier(entry.tier) ? [{ ...entry, tier: entry.tier }] : []));

/** Directory lists every tier. Recommended links are affiliate and premium. The strip and rails are premium only. */
export function tierAllows(tier: SponsorTier, placement: SponsorPlacement): boolean {
  if (placement === 'directory') return true;
  if (placement === 'course-card') return tier === 'affiliate' || tier === 'premium';
  return tier === 'premium';
}

export function sponsorsForPlacement(placement: SponsorPlacement): Sponsor[] {
  return sponsors.filter((sponsor) => tierAllows(sponsor.tier, placement));
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
