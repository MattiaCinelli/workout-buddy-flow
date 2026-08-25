import { FastifyInstance } from 'fastify';

// Unauthenticated on purpose: this only reports "the process is up and can
// reach its own database," not anything about a specific user, so there's
// nothing here worth gating behind a session. Used by the Docker
// HEALTHCHECK and useful for a quick "is this actually running" check.
export const registerHealthRoute = (app: FastifyInstance) => {
  app.get('/health', async (_request, reply) => {
    app.db.prepare('SELECT 1').get();
    reply.send({ status: 'ok' });
  });
};
