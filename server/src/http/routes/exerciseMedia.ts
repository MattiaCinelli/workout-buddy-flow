import fs from 'node:fs/promises';
import path from 'node:path';
import { FastifyInstance } from 'fastify';
import { getExerciseMediaDirectory } from '../../config';
import { requireAuth } from '../requireAuth';

const SAFE_JPEG_NAME = /^[a-z0-9][a-z0-9-]*\.jpg$/;

export const registerExerciseMediaRoute = (app: FastifyInstance) => {
  app.get<{ Params: { filename: string } }>(
    '/media/exercises/:filename',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { filename } = request.params;
      if (!SAFE_JPEG_NAME.test(filename)) {
        return reply.code(400).send({ error: 'Invalid exercise image name' });
      }

      const mediaDirectory = getExerciseMediaDirectory();
      const filePath = path.join(mediaDirectory, filename);
      try {
        const file = await fs.readFile(filePath);
        return reply
          .header('Cache-Control', 'private, max-age=86400')
          .type('image/jpeg')
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
