import { useEffect, useCallback, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within the referenced container element (useful for modals).
 * Listens for Tab / Shift+Tab and wraps focus to the first / last focusable element.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;

      const focusableElements = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref]);
}

let announceDiv: HTMLDivElement | null = null;

/**
 * Returns an `announce` function that pushes a message to a live region
 * so screen readers can announce it. The message is cleared after 1 second.
 */
export function useAnnounce(): (message: string) => void {
  const announce = useCallback((message: string) => {
    if (!announceDiv) {
      announceDiv = document.createElement('div');
      announceDiv.setAttribute('role', 'status');
      announceDiv.setAttribute('aria-live', 'polite');
      announceDiv.style.position = 'absolute';
      announceDiv.style.width = '1px';
      announceDiv.style.height = '1px';
      announceDiv.style.overflow = 'hidden';
      announceDiv.style.clip = 'rect(0 0 0 0)';
      announceDiv.style.whiteSpace = 'nowrap';
      document.body.appendChild(announceDiv);
    }

    announceDiv.textContent = message;

    setTimeout(() => {
      if (announceDiv) {
        announceDiv.textContent = '';
      }
    }, 1000);
  }, []);

  return announce;
}

interface SkipLinkProps {
  href: string;
  className: string;
  children: string;
}

/**
 * Returns props for a skip-to-content link that is visually hidden until focused.
 */
export function useSkipToContent(contentId: string): { skipLinkProps: SkipLinkProps } {
  const skipLinkProps: SkipLinkProps = {
    href: `#${contentId}`,
    className:
      'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none',
    children: 'Skip to content',
  };

  return { skipLinkProps };
}
