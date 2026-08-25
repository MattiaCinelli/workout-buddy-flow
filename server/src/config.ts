import path from 'node:path';
import fs from 'node:fs';

export const getDatabasePath = (): string => {
  const configured = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'workout-buddy.sqlite');
  fs.mkdirSync(path.dirname(configured), { recursive: true });
  return configured;
};
