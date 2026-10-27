/**
 * Which public routes draw a full-bleed hero behind the fixed header.
 *
 * The header is transparent until you scroll, because it was designed to float over the dark
 * homepage hero. That only works where something dark is actually there: everywhere else the
 * header has to be solid, and the page has to start below it rather than underneath it.
 *
 * Both of those follow from this one answer, so `Navbar` (transparency) and `PublicLayout`
 * (the height reserve) read it from here instead of keeping two lists that drift apart.
 */
const HERO_ROUTES = new Set([
  // HomePage's `.hero-banner` section.
  '/',
  // PageBanner consumers — the banner is full-bleed and reserves the header height itself.
  '/about',
  '/blogs',
  '/career',
  '/help',
  '/pricing',
  '/resume',
  '/salary-insights',
  '/subscription',
  '/testimonial',
]);

/**
 * Exact match rather than a prefix: `/blogs/:slug` is an ordinary article page with no banner,
 * and must not inherit `/blogs`'s answer.
 */
export function hasHeroBehindHeader(pathname: string): boolean {
  return HERO_ROUTES.has(pathname.replace(/\/+$/, '') || '/');
}

/**
 * Heroes that sit behind the header but are pale — the testimonial banner is #D6DFE4. They still
 * reserve the header height (above), but a transparent header's white controls vanish on them,
 * so the header starts solid there.
 */
const PALE_HERO_ROUTES = new Set(['/testimonial']);

/** Whether the header may start transparent: only over a dark hero. */
export function headerStartsTransparent(pathname: string): boolean {
  return hasHeroBehindHeader(pathname) && !PALE_HERO_ROUTES.has(pathname.replace(/\/+$/, '') || '/');
}
