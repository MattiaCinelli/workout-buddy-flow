import { openDb } from './db';
import { buildApp } from './http/app';
import { getDatabasePath } from './config';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const main = async () => {
  const db = openDb(getDatabasePath());
  const app = buildApp(db);
  await app.listen({ port: PORT, host: HOST });
  console.log(`Workout Buddy sync server listening on ${HOST}:${PORT}`);
};

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
