import { useEffect, useRef, useState } from 'react';

interface Props {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Ease-out cubic: decelerates towards the end. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animated count-up component.
 * Animates from 0 to `end` over `duration` ms using requestAnimationFrame.
 * Animation only starts when the element enters the viewport.
 */
function AnimatedCounter({ end, duration = 1000, prefix = '', suffix = '', className }: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          const start = performance.now();

          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            setValue(Math.round(eased * end));

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          }

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;
