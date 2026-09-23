import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Db } from '../db';
import { registerAuthRoutes } from './routes/auth';
import { registerSyncRoutes } from './routes/sync';
import { registerHealthRoute } from './routes/health';
import { registerAccountRoutes } from './routes/account';
import { registerSettingsRoutes } from './routes/settings';
import { registerExerciseMediaRoute } from './routes/exerciseMedia';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
  interface FastifyRequest {
    userId?: string;
    sessionToken?: string;
  }
}

// Builds the app without starting a listener, so tests can exercise routes
// via app.inject() (no real socket, no port conflicts) — see src/index.ts
// for the process that actually listens.
export const buildApp = (db: Db): FastifyInstance => {
  // bodyLimit: Fastify's default is 1 MiB, which a full sync push (exercise
  // images, workout history, …) easily exceeds — the client then gets a
  // "413 Payload Too Large" with no useful message. Allow generous batches;
  // the per-request maxItems caps in the sync routes still bound how many
  // records a single push can contain.
  const app = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 });
  app.decorate('db', db);

  // Never send internal error text (stack-derived messages, library
  // internals) to the caller: log it server-side, return a generic 500.
  // 4xx errors (validation, payload too large, ...) are the caller's to see.
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if ((error.statusCode ?? 500) >= 500) {
      console.error('Unhandled server error:', error);
      reply.code(500).send({ error: 'Internal Server Error' });
      return;
    }
    reply.send(error);
  });

  // Reflects whatever Origin the request sends (there's no cookie session
  // to protect here — auth is a Bearer token the browser never attaches
  // automatically, so CORS isn't the security boundary; it just needs to
  // not block the app's own fetch() calls, whichever origin it's served
  // from: a Vite dev server, a static build, or a Capacitor WebView).
  //
  // methods must be listed explicitly: @fastify/cors defaults to
  // 'GET,HEAD,POST' only, which silently blocks every PATCH request (the
  // account profile/email endpoints) with no server-side error — the
  // browser just refuses the preflight. Keep this in sync with whatever
  // verbs the routes below actually use.
  app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });

  registerHealthRoute(app);
  registerAuthRoutes(app);
  registerAccountRoutes(app);
  registerSettingsRoutes(app);
  registerExerciseMediaRoute(app);
  registerSyncRoutes(app);

  return app;
};
