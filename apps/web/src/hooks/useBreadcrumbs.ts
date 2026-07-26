import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Regex to detect dynamic route segments (UUIDs or numeric IDs). */
const isDynamic = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
  /^\d+$/.test(segment);

/**
 * Generates breadcrumb items from the current route path.
 * Maps each segment to an i18n label under `common:breadcrumbs.<segment>`.
 * Dynamic segments (UUIDs, numeric IDs) are skipped.
 * The first item is always "Home" linking to `/`.
 * The last item has no href (represents the current page).
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const { t } = useTranslation('common');

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: t('breadcrumbs.home'), href: '/' }];

  const validSegments = segments.filter((s) => !isDynamic(s));

  validSegments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, segments.indexOf(segment) + 1).join('/');
    const label = t(`breadcrumbs.${segment}`, segment);
    const isLast = index === validSegments.length - 1;

    items.push({ label, href: isLast ? undefined : href });
  });

  return items;
}
