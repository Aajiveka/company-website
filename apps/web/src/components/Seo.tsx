export const SITE_NAME = 'Aajiveka';
const DEFAULT_DESCRIPTION =
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
  description = DEFAULT_DESCRIPTION,
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
