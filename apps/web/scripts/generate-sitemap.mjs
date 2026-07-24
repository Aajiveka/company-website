#!/usr/bin/env node
/**
 * Generates a static sitemap.xml in the dist folder after build.
 * Run: node scripts/generate-sitemap.mjs
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.VITE_SITE_URL || 'https://www.aajiveka.com';

const staticRoutes = [
  '/',
  '/jobs',
  '/about',
  '/contact',
  '/blogs',
  '/career',
  '/pricing',
  '/testimonial',
  '/privacy',
  '/terms',
  '/subscription',
  '/resume',
  '/salary-insights',
  '/login',
  '/register',
  '/forgot-password',
];

const today = new Date().toISOString().split('T')[0];

const urls = staticRoutes.map(
  (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === '/' ? 'daily' : path === '/jobs' ? 'hourly' : 'weekly'}</changefreq>
    <priority>${path === '/' ? '1.0' : path === '/jobs' ? '0.9' : '0.7'}</priority>
  </url>`,
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

const outPath = resolve(__dirname, '../dist/sitemap.xml');
writeFileSync(outPath, sitemap, 'utf-8');

// Also generate robots.txt
const robots = `User-agent: *
Allow: /
Disallow: /candidate/
Disallow: /company/
Disallow: /admin/
Disallow: /recruitment/

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(resolve(__dirname, '../dist/robots.txt'), robots, 'utf-8');

console.log(`✓ sitemap.xml generated (${staticRoutes.length} URLs)`);
console.log('✓ robots.txt generated');
