import fs from 'node:fs/promises';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { getExerciseMediaDirectory } from '../../config';
import { requireAuth } from '../requireAuth';

const SAFE_IMAGE_NAME = /^[a-z0-9][a-z0-9-]*\.(?:jpg|gif)$/;

export const registerExerciseMediaRoute = (app: FastifyInstance) => {
  app.get<{ Params: { filename: string } }>(
    '/media/exercises/:filename',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { filename } = request.params;
      if (!SAFE_IMAGE_NAME.test(filename)) {
        return reply.code(400).send({ error: 'Invalid exercise image name' });
      }

      const mediaDirectory = getExerciseMediaDirectory();
      const filePath = path.join(mediaDirectory, filename);
      try {
        const [file, stat] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
        const etag = `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`;
        if (request.headers['if-none-match'] === etag) {
          return reply
            .header('Cache-Control', 'private, max-age=86400')
            .header('ETag', etag)
            .code(304)
            .send();
        }
        return reply
          .header('Cache-Control', 'private, max-age=86400')
          .header('ETag', etag)
          .type(filename.endsWith('.gif') ? 'image/gif' : 'image/jpeg')
          .send(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return reply.code(404).send({ error: 'Exercise image not found' });
        }
        throw error;
      }
    },
  );
};
