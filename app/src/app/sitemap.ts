export default function sitemap() {
    return [
        { url: 'https://grigou.fr', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
        { url: 'https://grigou.fr/login', lastModified: new Date(), priority: 0.5 },
        { url: 'https://grigou.fr/register', lastModified: new Date(), priority: 0.8 },
    ];
}