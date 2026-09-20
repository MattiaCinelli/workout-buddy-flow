import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getExerciseMediaDirectory } from './config';

const IMAGE_DATA_URL = /^data:image\/(jpeg|gif);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Moves a synchronized inline JPEG or GIF into authenticated private-media storage.
 * Content-addressed names deduplicate identical files without exposing an
 * exercise name or user identifier. Non-inline URLs pass through unchanged.
 */
export const storeInlineExerciseImage = (imageUrl?: string): string | undefined => {
  if (!imageUrl?.startsWith('data:')) return imageUrl;
  const match = IMAGE_DATA_URL.exec(imageUrl);
  // The app currently creates JPEGs and GIFs. Preserve an older/imported
  // inline format rather than making the whole exercise sync fail; it can
  // be migrated after support for that media type is added.
  if (!match) return imageUrl;

  const image = Buffer.from(match[2], 'base64');
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES) {
    throw new Error('Exercise image must be between 1 byte and 10 MB');
  }

  const extension = match[1] === 'gif' ? 'gif' : 'jpg';
  const filename = `uploaded-${crypto.createHash('sha256').update(image).digest('hex').slice(0, 32)}.${extension}`;
  const directory = getExerciseMediaDirectory();
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, filename);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, image, { mode: 0o600 });
  return `private-exercise:${filename}`;
};
