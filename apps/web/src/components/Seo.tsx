import { useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  Legacy named exports — preserved for backward compatibility        */
/* ------------------------------------------------------------------ */

export const SITE_NAME = 'Aajiveka';
const LEGACY_DEFAULT_DESCRIPTION =
  "Aajiveka — India's next-gen job portal connecting talented professionals with top employers. Search jobs, build resumes, and advance your career.";
export const SITE_URL = 'https://aajiveka.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/image/og-default.png`;

export interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  /** JSON-LD structured data object(s) to embed in the page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders SEO meta tags. React 19 hoists <title> and <meta> into <head>.
 * Usage: <Seo title="Find Jobs" description="..." path="/jobs" />
 */
export function Seo({
  title,
  description = LEGACY_DEFAULT_DESCRIPTION,
  path = '',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = title === 'Home' ? `${SITE_NAME} | Your Ultimate Career Partner` : `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${path}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(Array.isArray(jsonLd) ? jsonLd : jsonLd) }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  New useEffect-based SEO component (default export)                 */
/* ------------------------------------------------------------------ */

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const DEFAULT_TITLE = "Aajiveka — India's Job Portal";
const DEFAULT_DESCRIPTION =
  'Find your next role on Aajiveka. Browse thousands of jobs across India.';

function setMetaTag(property: string, content: string): void {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"], meta[name="${property}"]`,
  );

  if (!element) {
    element = document.createElement('meta');
    if (property.startsWith('og:')) {
      element.setAttribute('property', property);
    } else {
      element.setAttribute('name', property);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

export default function SEO({
  title,
  description,
  image,
  url,
}: SEOProps): null {
  useEffect(() => {
    const fullTitle = title ? `${title} | Aajiveka` : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;

    document.title = fullTitle;

    // Standard meta
    setMetaTag('description', desc);

    // Open Graph
    setMetaTag('og:title', fullTitle);
    setMetaTag('og:description', desc);
    setMetaTag('og:type', 'website');
    if (image) setMetaTag('og:image', image);
    if (url) setMetaTag('og:url', url);

    // Twitter
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', desc);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, image, url]);

  return null;
}
