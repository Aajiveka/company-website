interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  lazy?: boolean;
  sizes?: string;
}

const WEBP_CONVERTIBLE = /\.(jpe?g|png)$/i;

function toWebP(src: string): string {
  return src.replace(WEBP_CONVERTIBLE, '.webp');
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  sizes,
}: OptimizedImageProps) {
  const hasWebP = WEBP_CONVERTIBLE.test(src);

  return (
    <picture>
      {hasWebP && <source srcSet={toWebP(src)} type="image/webp" />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        sizes={sizes}
      />
    </picture>
  );
}
