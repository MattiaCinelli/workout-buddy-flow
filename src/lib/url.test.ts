import { describe, it, expect } from 'vitest';
import { normalizeHttpsUrl } from './url';

describe('normalizeHttpsUrl', () => {
  it('returns undefined for empty / whitespace / nullish input', () => {
    expect(normalizeHttpsUrl(undefined)).toBeUndefined();
    expect(normalizeHttpsUrl(null)).toBeUndefined();
    expect(normalizeHttpsUrl('')).toBeUndefined();
    expect(normalizeHttpsUrl('   ')).toBeUndefined();
  });

  it('assumes https:// for a bare host', () => {
    expect(normalizeHttpsUrl('youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc');
    expect(normalizeHttpsUrl('  vimeo.com/12345  ')).toBe('https://vimeo.com/12345');
  });

  it('keeps an explicit https:// link as-is', () => {
    expect(normalizeHttpsUrl('https://example.com/a?b=c#d')).toBe('https://example.com/a?b=c#d');
  });

  it('rejects a non-https scheme', () => {
    expect(normalizeHttpsUrl('http://insecure.example/x')).toBeUndefined();
    expect(normalizeHttpsUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeHttpsUrl('data:text/html,<script>')).toBeUndefined();
    expect(normalizeHttpsUrl('ftp://files.example/x')).toBeUndefined();
  });

  it('rejects something that cannot be parsed as a URL', () => {
    expect(normalizeHttpsUrl('not a url at all')).toBeUndefined();
    expect(normalizeHttpsUrl('https://')).toBeUndefined();
  });
});
