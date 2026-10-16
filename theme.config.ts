import type { ThemeConfig } from './types/theme-config.d.ts';
import { expressiveCodeThemes } from './expressive-code-themes.mjs';

// language files from ./src/i18n
// The `with { type: 'json' }` import attribute is required so this file can also be
// imported from a plain ESM context (e.g. `ec.config.mjs`, which Node loads directly).
import enStrings from './src/i18n/en.json' with { type: 'json' };

/** The only place the public site name is written. Everything else reads `themeConfig.name`. */
const siteName = 'Call to Reset';
const siteUrl = import.meta.env?.SITE_OVERRIDE || 'https://calltoreset.site';

export const themeConfig: ThemeConfig = {
  // `import.meta.env?.` is guarded because this file is also imported from `ec.config.mjs`,
  // which Node loads as plain ESM where `import.meta.env` is not defined (only Vite injects it).
  site: siteUrl,
  primaryColor: '#0f0f0f', // mind to also update the Tailwind config if you change this!
  themeColor: '#0f0f0f',
  generateWebmanifest: true,
  name: siteName,
  shortName: siteName,
  darkMode: true,
  robots: import.meta.env?.ROBOTS || 'index, follow',
  xHandle: '',

  // Structured data
  author: {
    type: 'Organization',
    name: siteName,
    url: siteUrl,
    image: '',
  },
  publisher: {
    type: 'Organization',
    name: siteName,
    url: siteUrl,
    image: '',
  },

  // I18n
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    languages: {
      en: 'English',
    },
    languageModules: {
      en: enStrings,
    },
  },

  // md(x) code block rendering - edit them in ./expressive-code-themes.mjs
  expressiveCodeThemes,

  // content/articles settings
  articles: {
    imageFallback: true,
    gridView: true,
    textOverImage: false,
    categories: true, // if set false, make sure to also remove category directories under /pages
    tags: true, // if set false, make sure to also remove tag directories under /pages
    entriesPerPage: 4,
    tocMaxDepth: 3,
    defaults: {
      author: {
        name: 'Jane Doe',
        url: 'https://en.wikipedia.org/wiki/Jane_Doe_(disambiguation)',
      },
    },
    social: {
      // default values - can be overridden at the Single component level
      xHandle: 'jekuer', // to be added as "via @handle" in the tweet
      buttons: {
        email: true,
        facebook: true,
        hackernews: true,
        linkedin: true,
        pinterest: false,
        reddit: true,
        telegram: false,
        x: true,
        whatsapp: false,
      },
      buttonsSmallScreen: {
        email: true,
        facebook: true,
        hackernews: false,
        linkedin: true,
        pinterest: false,
        reddit: true,
        telegram: true,
        x: true,
        whatsapp: true,
      },
    },
  },

  // promotion settings
  promotions: {
    newsletterSignup: false,
    footerBanner: false,
    navAd: false,
    topBanner: false,
    heroChip: false,
  },

  onDemandRenderedCollections: [],

  // content/events settings
  events: {
    // you can also dynamically integrate events from your Add to Calendar PRO account (https://add-to-calendar-pro.com/), having your API key set as environment variable ADD_TO_CALENDAR_PRO_API_KEY.
    dynamicEvents: {
      pullFromAddToCalendarPro: false,
      filterBy: {
        from: '',
        to: '',
        group: '',
      },
    },
  },

  // LLM and coding assistant settings
  llms: {
    autoGeneration: true,
    intro: "Free, plain-language Christian lessons on knowing God's love, knowing your identity in Christ, living a holy life and taking initiative. Freedom from addiction (porn, gaming, the phone, alcohol, substances) is one path inside it. For men and women. Lessons are short, practical and original.",
    excludePagesPattern: ['/404', '/404_dynamic'],
    includePages: [],
    addArticles: 'none',
    addEvents: 'none',
    addFAQ: 'none',
  },

  /** Whop community. Also the temporary target for “Apply soon” until growUrl is published. */
  communityUrl: 'https://whop.com/matei-bumb/call-to-reset-community/',
  /** Whop grow-further page. Not published yet. Do not link the button here until it is live. */
  growUrl: 'https://whop.com/matei-bumb/call-to-reset-grow-further/',

  sponsorPortalUrl: 'https://customer.dodopayments.com/login/bus_0NktsnPIFswdL6K7awd7R',
  sponsorHelpEmail: 'support@calltoreset.site',

  /** One partner tier: directory listing + side rails (desktop) + top strip (mobile). */
  sponsorTiers: [
    {
      id: 'premium',
      name: 'Partner',
      priceMonthly: 300,
      checkoutUrl: 'https://checkout.dodopayments.com/buy/pdt_0Nprln8LmHxuuYjWeJPGd?quantity=1',
    },
  ],
};
