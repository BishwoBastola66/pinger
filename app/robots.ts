import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/docs', '/docs/*'],
      disallow: ['/dashboard', '/dashboard/*'],
    },
    sitemap: 'https://pingr.site/sitemap.xml',
  };
}
