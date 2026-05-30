export default function robots() {
    return {
        rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api/'] },
        sitemap: 'https://grigou.fr/sitemap.xml',
    };
}