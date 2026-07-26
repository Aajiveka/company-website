interface PageMetaProps {
  title: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
}

export default function PageMeta({ title, description, ogImage, canonical }: PageMetaProps) {
  const fullTitle = title.includes('Aajiveka') ? title : `${title} | Aajiveka`;
  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonical && <link rel="canonical" href={canonical} />}
    </>
  );
}
