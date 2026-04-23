import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://formto.link'
  
  // Marketing static routes
  const routes = [
    '',
    '/solutions',
    '/pricing',
    '/enterprise',
    '/resources',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Resource detail routes (matched with CONTENT keys in resources/[slug]/_client.tsx)
  const resourceSlugs = [
    'form-builder',
    'analytics',
    'logic-branching',
    'security',
    'branding',
    'integrations',
  ]

  const resourceRoutes = resourceSlugs.map((slug) => ({
    url: `${baseUrl}/resources/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...routes, ...resourceRoutes]
}
