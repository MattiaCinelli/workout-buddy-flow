import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Db } from '../db';
import { registerAuthRoutes } from './routes/auth';
import { registerSyncRoutes } from './routes/sync';
import { registerHealthRoute } from './routes/health';

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
  const app = Fastify({ logger: false });
  app.decorate('db', db);

  // Reflects whatever Origin the request sends (there's no cookie session
  // to protect here — auth is a Bearer token the browser never attaches
  // automatically, so CORS isn't the security boundary; it just needs to
  // not block the app's own fetch() calls, whichever origin it's served
  // from: a Vite dev server, a static build, or a Capacitor WebView).
  app.register(cors, { origin: true });

  registerHealthRoute(app);
  registerAuthRoutes(app);
  registerSyncRoutes(app);

  return app;
};
