import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface AnchoredPanelPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

interface UseAnchoredPanelOptions {
  isOpen: boolean;
  onClose: () => void;
  /** Move focus to the panel's first button when it opens. */
  autoFocusFirst?: boolean;
}

/**
 * Portal-positioning, click-outside and arrow-key plumbing shared by the dropdowns that
 * render their panel into `document.body` — a portal + fixed positioning lets the panel
 * escape any `overflow-hidden` ancestor (e.g. the home page hero) that would clip it.
 */
export function useAnchoredPanel({ isOpen, onClose, autoFocusFirst = true }: UseAnchoredPanelOptions) {
  const [pos, setPos] = useState<AnchoredPanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const GAP = 4;
    const MARGIN = 8;
    const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    setPos({
      left: rect.left,
      top: openUp ? rect.top - GAP : rect.bottom + GAP,
      width: rect.width,
      maxHeight: Math.max(160, Math.min(320, available)),
      openUp,
    });
  }, []);

  // Click-outside (the panel lives in a portal, so check it separately)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Track the trigger position while open so the fixed-position portal stays anchored.
  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Focus first item when the panel opens
  useEffect(() => {
    if (isOpen && autoFocusFirst && panelRef.current) {
      panelRef.current.querySelector<HTMLElement>('button')?.focus();
    }
  }, [isOpen, autoFocusFirst]);

  const close = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose]);

  /** Roving arrow-key navigation over every button rendered inside the panel. */
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const items = panelRef.current
      ? Array.from(panelRef.current.querySelectorAll<HTMLElement>('button'))
      : [];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[idx < items.length - 1 ? idx + 1 : 0].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[idx > 0 ? idx - 1 : items.length - 1].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  /** Fixed-position style for the portaled panel. `pos` is null until it is measured. */
  const panelStyle: React.CSSProperties | null = pos && {
    position: 'fixed',
    left: pos.left,
    top: pos.top,
    width: pos.width,
    maxHeight: pos.maxHeight,
    transform: pos.openUp ? 'translateY(-100%)' : undefined,
  };

  return { containerRef, panelRef, triggerRef, panelStyle, onPanelKeyDown, close };
}
