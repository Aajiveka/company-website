import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitize';

describe('sanitizeHtml', () => {
  it('escapes < and > characters', () => {
    const result = sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(sanitizeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('handles plain text without escaping', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('escapes HTML tags in attribute-like strings', () => {
    const result = sanitizeHtml('<img onerror="alert(1)">');
    expect(result).toContain('&lt;img');
    expect(result).not.toContain('<img');
  });
});

describe('sanitizeUrl', () => {
  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('allows mailto URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('returns empty string for malformed URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
  });
});
