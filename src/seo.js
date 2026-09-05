// Central SEO constants + per-route metadata. Used by App.vue (which sets
// the document head on every navigation) and by the data views (which add
// a Dataset JSON-LD block). Route `meta.description` is set in
// router/index.js — section descriptions come from nav.js.

export const SITE_NAME = 'Why We Die'
export const SITE_URL = 'https://whywedie.org'
export const OG_IMAGE = `${SITE_URL}/og.png` // 1200×630; drop the file in public/
export const DEFAULT_DESCRIPTION =
  'Interactive US death, birth, and population statistics from the CDC — leading causes of ' +
  'death, birth and fertility rates, and natural increase, tracked from 1900 to today.'

// Non-section routes that still want their own title/description.
export const STANDALONE_META = {
  api: {
    title: 'Open Data API',
    description:
      "Free, CORS-enabled JSON endpoints for the site's CDC-derived mortality and natality " +
      'series — endpoint list, code examples, and licence.'
  },
  privacy: {
    title: 'Privacy',
    description:
      "Why We Die's privacy practices: no cookies, no analytics, no ads, no third-party tracking."
  }
}

/** JSON-LD describing the site itself — safe to include on every page. */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    creator: { '@type': 'Person', name: 'Levi Dahlstrom' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
  }
}

/**
 * JSON-LD Dataset block for a data page — helps it surface in Google
 * Dataset Search. `spatial`/`temporal`/`variable` describe the slice.
 */
export function datasetJsonLd({ name, description, path, temporal, keywords }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: `${SITE_URL}${path}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    spatialCoverage: 'United States',
    temporalCoverage: temporal,
    keywords,
    citation:
      'Centers for Disease Control and Prevention, National Center for Health Statistics — ' +
      'CDC WONDER and data.cdc.gov',
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${SITE_URL}/api`
      }
    ]
  }
}
