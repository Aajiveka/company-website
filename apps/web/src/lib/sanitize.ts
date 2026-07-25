/**
 * Lightweight HTML / URL sanitization helpers.
 * No external dependencies — uses the browser's built-in DOM APIs.
 */

/**
 * Escapes a plain-text string so it is safe to inject into HTML.
 * All special characters (&, <, >, ", ') are converted to their
 * corresponding HTML entities.
 */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validates a URL and returns it unchanged only if its protocol is one of
 * http:, https:, or mailto:. Returns an empty string for anything else
 * (e.g. javascript: URIs) or for malformed URLs.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return url;
    return '';
  } catch {
    return '';
  }
}
