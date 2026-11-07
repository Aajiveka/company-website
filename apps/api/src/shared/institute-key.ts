/**
 * Search key for an institution name — lowercased, punctuation and connective words removed.
 *
 * This is what stops "Dr. A.P.J. Abdul Kalam Technical University", "Dr APJ Abdul Kalam
 * Technical University" and "dr. a.p.j. abdul kalam technical university" from becoming three
 * rows: the column carries a UNIQUE constraint, so the second spelling is rejected on insert
 * rather than quietly doubling the suggestion list.
 *
 * Lives in src/ rather than prisma/data/ because the API adds institutions candidates type in,
 * and has to key them exactly as the seed does.
 */
export function instituteSearchKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|of|and|for)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * What the typeahead actually matches against: the search key plus the name's initialism.
 *
 * Nobody types "Indian Institute of Technology Patna" — they type "IIT Patna". Matching the
 * full name alone returns nothing for the acronym every Indian candidate uses, which makes the
 * suggestions look broken precisely on the best-known institutions. Appending the initials
 * ("indian institute technology patna" + "iitp") lets a token search find the row from either
 * half: "iit" hits the initialism, "patna" hits the name, and requiring every token to match
 * keeps "iit patna" from also returning IIT Bombay.
 *
 * Kept separate from `instituteSearchKey` because that column is UNIQUE and is what deduplicates
 * spellings; two institutions may legitimately share an initialism.
 */
export function instituteSearchText(name: string): string {
  const key = instituteSearchKey(name);
  const initials = key
    .split(' ')
    .map((w) => w[0])
    .join('');
  return `${key} ${initials}`;
}
