import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/reports',
          '/payments',
          '/expenses',
          '/employees',
          '/attendance',
          '/advances',
          '/repayments',
          '/work-entries',
          '/commission',
          '/charts',
          '/settings',
          '/billing',
          '/onboarding',
          '/employee-portal',
          '/viewer',
          '/super-admin',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.payeasebuddy.co.in/sitemap.xml',
  }
}
