/**
 * Our other apps, shown by Showcase.jsx.
 *
 * Plain links. No ad network, no third-party script, no tracking beyond the
 * utm_source already written into each URL. The logos are files in this site's
 * own public folder, so the unit costs nothing at runtime and the page still
 * makes no request to anywhere else. Nothing here runs until somebody clicks.
 *
 * The theme keys become `--sc-<key>` custom properties on each slide, so every ad
 * paints itself in its own brand colours and reads the same whatever theme
 * BridgeDays is in. Copy comes from each product's own site.
 *
 * Kept in `ads/makers.js` rather than `ads.js`: a blocker that hides files called
 * ads.js would break the import and take the page down with it.
 */
export const MAKERS = [
  {
    id: 'scrapeland',
    title: 'scrape.land',
    headline: 'The web, turned into data.',
    cta: 'Start free',
    url: 'https://scrape.land/?utm_source=bridgedays',
    logo: '/makers/scrapeland.svg',
    motif: 'data',
    theme: {
      bg: 'linear-gradient(160deg, #131d30, #0b0f17 62%)',
      fg: '#e9f0fa',
      muted: '#a8b5c7',
      accent: '#3fdc7a',
      'accent-2': '#54a8ff',
      'cta-bg': '#3fdc7a',
      'cta-ink': '#04140a',
      panel: 'rgba(255, 255, 255, .06)'
    }
  },
  {
    id: 'penholder',
    title: 'Penholder',
    headline: 'Everything is a priority. Put them in order.',
    cta: 'Try Penholder',
    url: 'https://penholder.app/?utm_source=bridgedays',
    logo: '/makers/penholder.svg',
    motif: 'order',
    theme: {
      bg: 'linear-gradient(155deg, #4f46e5, #6a3fd6)',
      fg: '#ffffff',
      muted: '#e4e2ff',
      accent: '#ffffff',
      'accent-2': '#c7d2fe',
      'cta-bg': '#ffffff',
      'cta-ink': '#3730a3',
      panel: 'rgba(255, 255, 255, .1)'
    }
  },
  {
    id: 'censory',
    title: 'Censory',
    headline: 'Redact personal data from PDFs and scans.',
    cta: 'Try Censory',
    url: 'https://censory.app/?utm_source=bridgedays',
    logo: '/makers/censory.svg',
    motif: 'redact',
    theme: {
      bg: '#111a26',
      fg: '#f4efe3',
      muted: '#c0c7d2',
      accent: '#c9a24a',
      'accent-2': '#e3c37a',
      'cta-bg': '#c9a24a',
      'cta-ink': '#111a26',
      panel: '#f4efe3'
    }
  },
  {
    id: 'vetrosoft',
    title: 'Vetrosoft',
    headline: 'The website your business is missing.',
    cta: 'Get a website',
    url: 'https://vetrosoft.com/?utm_source=bridgedays',
    logo: '/makers/vetrosoft.svg',
    motif: 'site',
    theme: {
      bg: 'linear-gradient(160deg, #1c1917, #0c0a09 60%)',
      fg: '#faf6f1',
      muted: '#d6cfc4',
      accent: '#2b8cff',
      'accent-2': '#63f0ff',
      'cta-bg': 'linear-gradient(135deg, #63f0ff, #2b8cff 50%, #7d6cff)',
      'cta-ink': '#0c0a09',
      panel: 'linear-gradient(160deg, #1f3b5c, #2a2350)'
    }
  }
]

/** Time between moves. The timer animation runs for exactly this long. */
export const INTERVAL_MS = 6000
