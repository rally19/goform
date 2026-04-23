import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/solutions',
        '/pricing',
        '/enterprise',
        '/resources',
        '/_next/static/media/', // Allow images/fonts
      ],
      disallow: [
        '/dashboard/',
        '/admin/',
        '/login',
        '/signup',
        '/settings/',
        '/api/',
        '/forms/*/responses', // Prevent indexing private data routes if any
      ],
    },
    sitemap: 'https://formto.link/sitemap.xml',
  }
}
