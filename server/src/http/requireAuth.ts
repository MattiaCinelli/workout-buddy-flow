import { FastifyReply, FastifyRequest } from 'fastify';
import { getValidSession } from '../db/sessions';

const BEARER_PREFIX = 'Bearer ';

// A preHandler for routes that need an authenticated user. On success it
// attaches userId/sessionToken to the request for the route handler to use;
// on failure it sends 401 itself and the route handler never runs.
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;

  if (!token) {
    reply.code(401).send({ error: 'Missing bearer token' });
    return reply;
  }

  const session = getValidSession(request.server.db, token);
  if (!session) {
    reply.code(401).send({ error: 'Invalid or expired session' });
    return reply;
  }

  request.userId = session.userId;
  request.sessionToken = session.token;
};
