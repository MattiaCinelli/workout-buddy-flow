// Matching for the hands-free "next" command in guided workouts. The speech
// recogniser returns a few alternative transcripts per utterance ("next",
// "Next!", "next please"); the command fires when any of them contains the
// chosen word or phrase as whole words, so "nextflix" or "annex" do not.

export const DEFAULT_VOICE_COMMAND_WORD = 'next';

/** Lowercase, accents removed ("Già" → "gia"), punctuation dropped, spaces collapsed. */
export const normalizeSpeech = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** One to three words of letters only, 2–24 characters in total. */
export const isValidCommandWord = (word: string): boolean => {
  const normalized = normalizeSpeech(word);
  return normalized.length >= 2 && normalized.length <= 24
    && /^\p{L}+( \p{L}+){0,2}$/u.test(normalized);
};

export const matchesCommand = (matches: readonly string[], word: string): boolean => {
  const command = normalizeSpeech(word);
  if (!command) return false;
  return matches.some(match => ` ${normalizeSpeech(match)} `.includes(` ${command} `));
};
