import { FastifyInstance } from 'fastify';
import { getUserByEmail } from '../../db/users';
import { createSession, deleteSession } from '../../db/sessions';
import { verifyPassword } from '../../auth/password';
import { requireAuth } from '../requireAuth';

interface LoginBody {
  email?: string;
  password?: string;
}

const INVALID_CREDENTIALS = { error: 'Invalid email or password' };
// A syntactically valid throwaway hash makes unknown-email attempts do the
// same expensive KDF work as wrong-password attempts, reducing the timing
// signal available for account enumeration.
const DUMMY_PASSWORD_HASH = `scrypt:${'00'.repeat(16)}:${'00'.repeat(64)}`;

export const registerAuthRoutes = (app: FastifyInstance) => {
  app.post<{ Body: LoginBody }>('/auth/login', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', minLength: 1, maxLength: 320 },
          password: { type: 'string', minLength: 1, maxLength: 1024 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      reply.code(400).send({ error: 'email and password are required' });
      return;
    }

    const user = getUserByEmail(app.db, email.trim().toLowerCase());
    // Same response whether the email is unknown or the password is wrong —
    // distinguishing the two would let a caller enumerate which emails have
    // accounts on this server.
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      reply.code(401).send(INVALID_CREDENTIALS);
      return;
    }

    const session = createSession(app.db, user.id);
    reply.send({ token: session.token, expiresAt: session.expiresAt, displayName: user.displayName });
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    deleteSession(app.db, request.sessionToken!);
    reply.code(204).send();
  });
};
