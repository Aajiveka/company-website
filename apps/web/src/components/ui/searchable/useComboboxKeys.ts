import { useCallback, useEffect, useState } from 'react';

interface UseComboboxKeysOptions {
  /** How many selectable rows are currently rendered. */
  count: number;
  /** Prefix for the per-row DOM ids that drive `aria-activedescendant`. */
  listId: string;
  onPick: (index: number) => void;
  onClose: () => void;
}

/**
 * Arrow/Enter/Escape handling for a search input that drives a listbox below it, plus the
 * `aria-activedescendant` plumbing that tells a screen reader which row is current.
 *
 * Rows are addressed by DOM id rather than by child index because a filtered list can be
 * interleaved with group headings — `children[activeIndex]` would point at the wrong node.
 */
export function useComboboxKeys({ count, listId, onPick, onClose }: UseComboboxKeysOptions) {
  const [activeIndex, setActiveIndex] = useState(0);

  const optionId = useCallback((index: number) => `${listId}-opt-${index}`, [listId]);

  // Re-filtering shrinks the list under the cursor; put it back on the best match.
  useEffect(() => {
    setActiveIndex((i) => (i >= count ? 0 : i));
  }, [count]);

  useEffect(() => {
    // Optional call: jsdom has no scrollIntoView, and the unit tests run there.
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, optionId]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (count ? (i + 1) % count : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (count ? (i - 1 + count) % count : 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(count ? count - 1 : 0);
      } else if (e.key === 'Enter') {
        // Only swallow Enter when there is something to pick, so it still submits the form.
        if (count > 0) {
          e.preventDefault();
          onPick(activeIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [count, activeIndex, onPick, onClose],
  );

  return {
    activeIndex,
    setActiveIndex,
    onKeyDown,
    optionId,
    activeId: count > 0 ? optionId(activeIndex) : undefined,
  };
}
