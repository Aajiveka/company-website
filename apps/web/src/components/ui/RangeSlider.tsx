import { useCallback, useRef, useState } from 'react';

export interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Dual-handle range slider with filled track and tooltips.
 * Pure CSS + JS, no external dependencies. Supports dark mode.
 */
export function RangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  label,
  formatValue = String,
  className = '',
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const [hovering, setHovering] = useState<'min' | 'max' | null>(null);

  const range = max - min || 1;
  const minPercent = ((value[0] - min) / range) * 100;
  const maxPercent = ((value[1] - min) / range) * 100;

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * range;
      const clamped = Math.min(max, Math.max(min, raw));
      return Math.round(clamped / step) * step;
    },
    [min, max, range, step],
  );

  const handlePointerDown = useCallback(
    (handle: 'min' | 'max') => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const newVal = getValueFromPosition(e.clientX);
      if (dragging === 'min') {
        onChange([Math.min(newVal, value[1]), value[1]]);
      } else {
        onChange([value[0], Math.max(newVal, value[0])]);
      }
    },
    [dragging, getValueFromPosition, onChange, value],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatValue(value[0])} - {formatValue(value[1])}
          </span>
        </div>
      )}
      <div
        ref={trackRef}
        className="relative h-10 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track background */}
        <div className="absolute left-0 right-0 top-4 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        {/* Active track */}
        <div
          className="absolute top-4 h-1.5 rounded-full bg-primary"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        {/* Min handle */}
        <div
          className="absolute top-2.5 -ml-2.5 h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-white shadow-md transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 active:cursor-grabbing dark:bg-gray-800"
          style={{ left: `${minPercent}%` }}
          onPointerDown={handlePointerDown('min')}
          onMouseEnter={() => setHovering('min')}
          onMouseLeave={() => setHovering(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange([Math.max(min, Math.min(value[0] - step, value[1])), value[1]]);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange([Math.min(value[0] + step, value[1]), value[1]]);
            }
          }}
          role="slider"
          aria-label={`${label ?? 'Range'} minimum`}
          aria-valuemin={min}
          aria-valuemax={value[1]}
          aria-valuenow={value[0]}
          aria-valuetext={formatValue(value[0])}
          tabIndex={0}
        >
          {(dragging === 'min' || hovering === 'min') && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-0.5 text-xs text-white shadow dark:bg-gray-700">
              {formatValue(value[0])}
            </div>
          )}
        </div>
        {/* Max handle */}
        <div
          className="absolute top-2.5 -ml-2.5 h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-white shadow-md transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 active:cursor-grabbing dark:bg-gray-800"
          style={{ left: `${maxPercent}%` }}
          onPointerDown={handlePointerDown('max')}
          onMouseEnter={() => setHovering('max')}
          onMouseLeave={() => setHovering(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange([value[0], Math.max(value[0], value[1] - step)]);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange([value[0], Math.min(max, value[1] + step)]);
            }
          }}
          role="slider"
          aria-label={`${label ?? 'Range'} maximum`}
          aria-valuemin={value[0]}
          aria-valuemax={max}
          aria-valuenow={value[1]}
          aria-valuetext={formatValue(value[1])}
          tabIndex={0}
        >
          {(dragging === 'max' || hovering === 'max') && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-0.5 text-xs text-white shadow dark:bg-gray-700">
              {formatValue(value[1])}
            </div>
          )}
        </div>
        {/* Screen-reader live region for current values */}
        <div className="sr-only" aria-live="polite">
          {formatValue(value[0])} to {formatValue(value[1])}
        </div>
      </div>
    </div>
  );
}
