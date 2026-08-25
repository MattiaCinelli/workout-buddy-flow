import { FastifyInstance } from 'fastify';
import { Db } from '../db';
import { requireAuth } from './requireAuth';

export interface SyncedRecord {
  id: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SyncCollectionConfig<T extends SyncedRecord> {
  /** Used as both the URL segment (/sync/<path>) and the request/response body key. */
  path: string;
  listChangedSince: (db: Db, userId: string, since?: string) => T[];
  upsertBatch: (db: Db, userId: string, items: T[]) => T[];
  /** JSON schema for one item, used to validate POST bodies before the handler runs. */
  itemSchema: object;
  maxBatchSize?: number;
}

const DEFAULT_MAX_BATCH_SIZE = 1000;

// Every synced collection shares the exact same GET (pull since a
// watermark) and POST (push a batch, last-write-wins) shape — only the
// table-specific repository functions and item schema differ. Registering
// through this factory instead of hand-writing five near-identical route
// pairs means that shape only needs fixing in one place if it ever changes.
export const registerSyncCollection = <T extends SyncedRecord>(
  app: FastifyInstance,
  config: SyncCollectionConfig<T>
) => {
  const { path, listChangedSince, upsertBatch, itemSchema, maxBatchSize = DEFAULT_MAX_BATCH_SIZE } = config;
  const url = `/sync/${path}`;

  app.get<{ Querystring: { since?: string } }>(url, { preHandler: requireAuth }, async (request, reply) => {
    const items = listChangedSince(app.db, request.userId!, request.query.since);
    reply.send({ [path]: items, serverTime: new Date().toISOString() });
  });

  app.post<{ Body: Record<string, T[]> }>(url, {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: [path],
        properties: {
          [path]: { type: 'array', maxItems: maxBatchSize, items: itemSchema },
        },
      },
    },
  }, async (request, reply) => {
    const stored = upsertBatch(app.db, request.userId!, request.body[path]);
    reply.send({ [path]: stored });
  });
};
