import { useMemo } from 'react';

/**
 * Lists at or below this length render as a plain native <select> — a search box over eight
 * options is noise, and the OS picker is the better control on a phone. Above it, the
 * dropdown grows a search field. `tblMstrSubFunctions` alone is ~1,566 rows.
 */
export const SEARCHABLE_THRESHOLD = 10;

/** Hard cap on rows rendered at once, so a 1,566-option master never lands in the DOM whole. */
export const MAX_RENDERED_OPTIONS = 100;

export interface SearchOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Section heading this option sits under — an <optgroup> label, or a state name. */
  group?: string;
  /** Extra text matched alongside the label: a state, a dial code, an institution's city. */
  hint?: string;
}

/** Lowercase and collapse runs of whitespace, so "  New   Delhi " matches "new delhi". */
export function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Where `q` sits inside `text`, as a rank that sorts best-first: 0 the text starts with the
 * query, 1 a word inside it does, 2 anywhere else, -1 not at all.
 *
 * The word-boundary tier is what puts "Pune" above "Rajpundri" for `pun`, and "Agency
 * Manager" above "Travel Agency Coordinator" for `agency`.
 */
export function matchRank(text: string, q: string): number {
  const i = text.indexOf(q);
  if (i < 0) return -1;
  if (i === 0) return 0;
  return text[i - 1] === ' ' ? 1 : 2;
}

export interface OptionSearchResult {
  /** Matching options, best match first, truncated to `limit`. */
  items: SearchOption[];
  /** Matches beyond `limit` that were dropped — surfaced as a "keep typing" row. */
  hiddenCount: number;
}

/**
 * Filter and rank options against a free-text query.
 *
 * An empty query returns the list in its original order (the masters endpoint already sorts
 * alphabetically) so opening a dropdown never reshuffles it.
 */
export function useOptionSearch(
  options: readonly SearchOption[],
  query: string,
  limit: number = MAX_RENDERED_OPTIONS,
): OptionSearchResult {
  return useMemo(() => {
    const q = norm(query);

    if (!q) {
      return {
        items: options.slice(0, limit),
        hiddenCount: Math.max(0, options.length - limit),
      };
    }

    const ranked: { option: SearchOption; rank: number }[] = [];
    for (const option of options) {
      const haystack = norm(option.hint ? `${option.label} ${option.hint}` : option.label);
      const rank = matchRank(haystack, q);
      if (rank >= 0) ranked.push({ option, rank });
    }

    // Stable by rank: Array.prototype.sort is stable, so equal ranks keep masters order.
    ranked.sort((a, b) => a.rank - b.rank);

    return {
      items: ranked.slice(0, limit).map((r) => r.option),
      hiddenCount: Math.max(0, ranked.length - limit),
    };
  }, [options, query, limit]);
}
