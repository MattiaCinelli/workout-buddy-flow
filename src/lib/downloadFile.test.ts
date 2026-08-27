/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativePlatform, writeFile, share } = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  writeFile: vi.fn(async (_opts: unknown) => ({ uri: 'file:///cache/out.txt' })),
  share: vi.fn(async (_opts: unknown) => {}),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile },
}));
vi.mock('@capacitor/share', () => ({ Share: { share } }));

import { saveTextFile } from './downloadFile';

beforeEach(() => {
  isNativePlatform.mockReturnValue(false);
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe('saveTextFile', () => {
  it('on the web: creates an object URL, clicks a download link, then revokes it', async () => {
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await saveTextFile('hello', 'notes.txt', 'text/plain');

    expect(createURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeURL).toHaveBeenCalledWith('blob:x');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('on native: writes to the cache dir and opens the share sheet', async () => {
    isNativePlatform.mockReturnValue(true);

    await saveTextFile('hello', 'notes.txt', 'text/plain');

    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'notes.txt', data: 'hello' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///cache/out.txt' }));
  });
});
