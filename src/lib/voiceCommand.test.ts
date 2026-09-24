import { describe, expect, it } from 'vitest';
import { isValidCommandWord, matchesCommand, normalizeSpeech } from './voiceCommand';

describe('normalizeSpeech', () => {
  it('lowercases, strips accents and punctuation, and collapses spaces', () => {
    expect(normalizeSpeech('  Next!  ')).toBe('next');
    expect(normalizeSpeech('Più   veloce, già.')).toBe('piu veloce gia');
  });
});

describe('matchesCommand', () => {
  it('matches the word on its own or inside a phrase, in any alternative', () => {
    expect(matchesCommand(['Next'], 'next')).toBe(true);
    expect(matchesCommand(['text', 'next please'], 'next')).toBe(true);
  });

  it('matches whole words only', () => {
    expect(matchesCommand(['nextflix', 'annex'], 'next')).toBe(false);
  });

  it('supports multi-word and accented commands', () => {
    expect(matchesCommand(['ok, go on now'], 'go on')).toBe(true);
    expect(matchesCommand(['Avanti!'], 'avanti')).toBe(true);
    expect(matchesCommand(['perché'], 'perche')).toBe(true);
  });

  it('never matches an empty command', () => {
    expect(matchesCommand(['anything'], '  ')).toBe(false);
  });
});

describe('isValidCommandWord', () => {
  it('accepts one to three words of letters', () => {
    expect(isValidCommandWord('next')).toBe(true);
    expect(isValidCommandWord('Avanti')).toBe(true);
    expect(isValidCommandWord('go on now')).toBe(true);
  });

  it('rejects numbers, single letters, long phrases and symbols', () => {
    expect(isValidCommandWord('3')).toBe(false);
    expect(isValidCommandWord('x')).toBe(false);
    expect(isValidCommandWord('one two three four')).toBe(false);
    expect(isValidCommandWord('next!!')).toBe(true); // punctuation is ignored, not rejected
    expect(isValidCommandWord('next2')).toBe(false);
  });
});
