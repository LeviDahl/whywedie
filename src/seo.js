// Central SEO constants + per-route metadata. Used by App.vue (which sets
// the document head on every navigation) and by the data views (which add
// a Dataset JSON-LD block). Route `meta.description` is set in
// router/index.js — section descriptions come from nav.js.

export const SITE_NAME = 'Why We Die'
export const SITE_URL = 'https://whywedie.org'
export const OG_IMAGE = `${SITE_URL}/og.png` // 1200×630; drop the file in public/
export const DEFAULT_DESCRIPTION =
  'Interactive US death, birth, and population statistics from the CDC: leading causes of ' +
  'death, birth and fertility rates, and natural increase since 1900.'

// Non-section routes that still want their own title/description.
export const STANDALONE_META = {
  api: {
    title: 'Open Data API',
    description:
      "Free, CORS-enabled JSON endpoints for the site's CDC-derived mortality and natality " +
      'series, with an endpoint list, code examples, and licence.'
  },
  privacy: {
    title: 'Privacy',
    description:
      "Why We Die's privacy practices: no cookies, no ads. Analytics is Umami, a cookieless, " +
      'aggregate-only tool that respects Do Not Track.'
  },
  articles: {
    title: 'Articles',
    description:
      'Short essays on the oddities in US mortality, birth, and population data: COVID-19, ' +
      'the 1918 influenza pandemic, the 2011 heart-disease dip, and more.'
  },
  notes: {
    title: 'Data Notes',
    description:
      'Quick takes on the US mortality, birth, and population data: one chart, a paragraph or ' +
      'two. Shorter and more frequent than the Articles.'
  },
  contact: {
    title: 'Contact',
    description:
      'Report a bug or data error on GitHub, or email feedback and ideas. An independent, ' +
      'one-person project.'
  }
}

export const REPO_URL = 'https://github.com/LeviDahl/whywedie'

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
    sameAs: [REPO_URL],
    creator: { '@type': 'Person', name: 'Levi Dahlstrom' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, sameAs: [REPO_URL] }
  }
}

/**
 * JSON-LD DataCatalog for the /api page — lists every /data/*.json file as
 * a Dataset whose distribution points at the real download URL. This is the
 * structured-data hook for Google Dataset Search and for researchers.
 * `endpoints` = [{ path: '/foo.json', what: '…' }] (from ApiView).
 */
export function dataCatalogJsonLd(endpoints) {
  const publisher = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, sameAs: [REPO_URL] }
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: `${SITE_NAME} — Open Data`,
    url: `${SITE_URL}/api`,
    description:
      'CORS-open JSON snapshots of US mortality and natality statistics, consolidated from ' +
      'CDC WONDER and data.cdc.gov. Public domain (CC0).',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    publisher,
    creator: publisher,
    dataset: endpoints
      .filter((e) => e.path !== '/meta.json')
      .map((e) => ({
        '@type': 'Dataset',
        name: e.path.replace(/^\//, '').replace(/\.json$/, ''),
        description: e.what,
        url: `${SITE_URL}/api`,
        license: 'https://creativecommons.org/publicdomain/zero/1.0/',
        isAccessibleForFree: true,
        spatialCoverage: 'United States',
        creator: publisher,
        publisher,
        citation:
          'Centers for Disease Control and Prevention, National Center for Health Statistics — ' +
          'CDC WONDER and data.cdc.gov',
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${SITE_URL}/data${e.path}`
        }
      }))
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
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
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

/**
 * JSON-LD BlogPosting block for an article page. `path` is the route
 * ("/articles/<slug>"); dates are "YYYY-MM-DD" strings.
 */
export function articleJsonLd({ title, description, path, datePublished, dateModified }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    datePublished,
    dateModified: dateModified || datePublished,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    image: OG_IMAGE,
    author: { '@type': 'Person', name: 'Levi Dahlstrom' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    isPartOf: { '@type': 'Blog', name: `${SITE_NAME} — Articles`, url: `${SITE_URL}/articles` }
  }
}

/** JSON-LD for a Data Note — a short, chart-first post (schema.org Article). */
export function noteJsonLd({ title, description, path, datePublished }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    datePublished,
    dateModified: datePublished,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    image: OG_IMAGE,
    author: { '@type': 'Person', name: 'Levi Dahlstrom' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
  }
}
