import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard', '/analytics', '/recurrences', '/api/'],
        },
        sitemap: 'https://grigou.fr/sitemap.xml',
        host: 'https://grigou.fr',
    };
}
