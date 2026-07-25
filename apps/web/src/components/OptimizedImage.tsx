import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useLazyImage } from '@/hooks/useLazyImage';
import { Skeleton } from '@/components/ui/Skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

function OptimizedImage({ src, alt, width, height, className }: OptimizedImageProps) {
  const { ref, isInView } = useLazyImage();
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{ width, height }}
      className={cn('relative overflow-hidden', className)}
    >
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full" />}
      {isInView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}

export default OptimizedImage;
