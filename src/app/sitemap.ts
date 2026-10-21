import type { MetadataRoute } from 'next';

// Static export has no server at request time, so these must be rendered at
// build time. Without it Next refuses to emit the route at all.
export const dynamic = 'force-static';

/**
 * Sitemap.
 *
 * Every route is listed explicitly rather than walked from the filesystem. A
 * static export has no runtime to enumerate routes, and the list is short enough
 * that keeping it honest by hand is cheap — the alternative is a sitemap that
 * quietly stops matching the site.
 *
 * Priorities reflect what the site is for: the app and the crypto spec are what
 * people are looking for; legal pages exist to be found only if you need them.
 */
const SITE_URL = 'https://arshield.pages.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    // Agents is the highest-intent destination: it is the one surface a visitor
    // can use with no wallet and no setup, so it outranks the workspace here.
    { path: '/chat', priority: 0.97, changeFrequency: 'weekly' },
    { path: '/app', priority: 0.95, changeFrequency: 'weekly' },
    { path: '/mcp', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/m', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/verify', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/docs', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/docs/architecture', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/docs/security', priority: 0.75, changeFrequency: 'monthly' },
    { path: '/docs/features', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/docs/tokenomics', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/docs/roadmap', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/docs/getting-started', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
