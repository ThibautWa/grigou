import type { MetadataRoute } from 'next';

// Only public, indexable pages. Bump LAST_UPDATE when their content changes.
const LAST_UPDATE = new Date('2026-11-23');

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: 'https://grigou.fr/', lastModified: LAST_UPDATE, changeFrequency: 'monthly', priority: 1 },
        { url: 'https://grigou.fr/register', lastModified: LAST_UPDATE, changeFrequency: 'yearly', priority: 0.6 },
    ];
}
