import type { MetadataRoute } from 'next';

// Static export has no server at request time, so these must be rendered at
// build time. Without it Next refuses to emit the route at all.
export const dynamic = 'force-static';

/**
 * robots.txt.
 *
 * Everything is public — there is no admin area, no user data, and nothing
 * behind a login. The one thing worth keeping out of the index is `/m`, because
 * those URLs carry a sealed message in the fragment: a crawler that follows a
 * shared link would put a (useless to it, but still) recipient-specific URL into
 * search results, and the person who shared it did not intend that.
 */
const SITE_URL = 'https://arshield.pages.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/m/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
