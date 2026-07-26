import { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
}

/**
 * Simple windowed list using IntersectionObserver.
 * Renders only visible items plus a configurable overscan buffer.
 * No external library required.
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  className,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  const totalHeight = items.length * itemHeight;

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan,
    );

    setVisibleRange((prev) => {
      if (prev.start === start && prev.end === end) return prev;
      return { start, end };
    });
  }, [itemHeight, items.length, overscan]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial calculation
    recalculate();

    container.addEventListener('scroll', recalculate, { passive: true });
    const resizeObserver = new ResizeObserver(recalculate);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', recalculate);
      resizeObserver.disconnect();
    };
  }, [recalculate]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: visibleRange.start * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, i) => (
            <div key={visibleRange.start + i} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
