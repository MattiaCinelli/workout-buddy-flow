import { FastifyInstance } from 'fastify';
import { getUserSettings, upsertUserSettings } from '../../db/userSettings';
import { requireAuth } from '../requireAuth';

interface PutSettingsBody {
  // The client's settings object — arbitrary JSON, stored verbatim.
  settings?: unknown;
  // The client's clock at the moment it last changed a setting. Drives
  // last-write-wins, same as `updatedAt` on every synced record.
  updatedAt?: string;
}

// Account-level preferences: a single JSON blob per user, not a collection.
// GET returns the whole thing (or nulls if nothing's stored yet); PUT
// upserts it with last-write-wins on `updatedAt` and returns the winner.
// The server treats `settings` as opaque — it never inspects the shape.
export const registerSettingsRoutes = (app: FastifyInstance) => {
  app.get('/settings', { preHandler: requireAuth }, async (request, reply) => {
    const stored = getUserSettings(app.db, request.userId!);
    if (!stored) {
      reply.send({ settings: null, updatedAt: null });
      return;
    }
    reply.send({ settings: JSON.parse(stored.data), updatedAt: stored.updatedAt });
  });

  app.put<{ Body: PutSettingsBody }>('/settings', { preHandler: requireAuth }, async (request, reply) => {
    const { settings, updatedAt } = request.body ?? {};
    if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
      reply.code(400).send({ error: 'settings must be an object' });
      return;
    }
    if (typeof updatedAt !== 'string' || !updatedAt) {
      reply.code(400).send({ error: 'updatedAt is required' });
      return;
    }

    const winner = upsertUserSettings(app.db, request.userId!, JSON.stringify(settings), updatedAt);
    reply.send({ settings: JSON.parse(winner.data), updatedAt: winner.updatedAt });
  });
};
