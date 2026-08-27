import { FastifyInstance } from 'fastify';
import { getUserByEmail, getUserById, updateDisplayName, updateEmail, updatePasswordHash } from '../../db/users';
import { countOtherSessionsForUser, deleteOtherSessionsForUser } from '../../db/sessions';
import { deleteAccount } from '../../db/account';
import { hashPassword, verifyPassword } from '../../auth/password';
import { requireAuth } from '../requireAuth';

interface UpdateProfileBody {
  displayName?: string;
}

interface UpdateEmailBody {
  currentPassword?: string;
  email?: string;
}

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

interface DeleteAccountBody {
  currentPassword?: string;
}

const MIN_PASSWORD_LENGTH = 8;

const toAccountView = (user: { id: string; email: string; displayName?: string }) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

export const registerAccountRoutes = (app: FastifyInstance) => {
  app.get('/account', { preHandler: requireAuth }, async (request, reply) => {
    const user = getUserById(app.db, request.userId!);
    if (!user) { reply.code(404).send({ error: 'Account not found' }); return; }
    reply.send(toAccountView(user));
  });

  // Cosmetic — no current-password check, unlike email/password below.
  app.patch<{ Body: UpdateProfileBody }>('/account/profile', { preHandler: requireAuth }, async (request, reply) => {
    const displayName = request.body?.displayName?.trim();
    if (!displayName) { reply.code(400).send({ error: 'displayName is required' }); return; }

    const updated = updateDisplayName(app.db, request.userId!, displayName);
    reply.send(toAccountView(updated));
  });

  // Changes the login identity, so this requires re-proving the password —
  // same reasoning as the password change below.
  app.patch<{ Body: UpdateEmailBody }>('/account/email', { preHandler: requireAuth }, async (request, reply) => {
    const { currentPassword, email } = request.body ?? {};
    if (!currentPassword || !email) {
      reply.code(400).send({ error: 'currentPassword and email are required' });
      return;
    }

    const user = getUserById(app.db, request.userId!);
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      reply.code(401).send({ error: 'Current password is incorrect' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = getUserByEmail(app.db, normalizedEmail);
    if (existing && existing.id !== user.id) {
      reply.code(409).send({ error: 'That email is already in use' });
      return;
    }

    const updated = updateEmail(app.db, user.id, normalizedEmail);
    reply.send(toAccountView(updated));
  });

  app.post<{ Body: ChangePasswordBody }>('/account/password', { preHandler: requireAuth }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body ?? {};
    if (!currentPassword || !newPassword) {
      reply.code(400).send({ error: 'currentPassword and newPassword are required' });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      reply.code(400).send({ error: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const user = getUserById(app.db, request.userId!);
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      reply.code(401).send({ error: 'Current password is incorrect' });
      return;
    }

    updatePasswordHash(app.db, user.id, await hashPassword(newPassword));
    // Every other device now has to re-authenticate with the new password;
    // the session that made this change stays valid since it already
    // proved it knows the new password by providing the old one correctly.
    deleteOtherSessionsForUser(app.db, user.id, request.sessionToken!);
    reply.code(204).send();
  });

  // How many other devices currently hold a live session. No per-session
  // detail (the sessions table is keyed by the token hash and has no
  // stable public id) — just a count, which is all the "sign out other
  // devices" affordance needs.
  app.get('/account/sessions', { preHandler: requireAuth }, async (request, reply) => {
    const otherDevices = countOtherSessionsForUser(app.db, request.userId!, request.sessionToken!);
    reply.send({ otherDevices });
  });

  // Revoke every session except this one. No password re-check: this only
  // ever reduces access, and the caller already holds a valid session.
  // Those devices fall back to offline mode with their local data intact
  // and have to reconnect.
  app.post('/account/sessions/revoke-others', { preHandler: requireAuth }, async (request, reply) => {
    deleteOtherSessionsForUser(app.db, request.userId!, request.sessionToken!);
    reply.code(204).send();
  });

  // Irreversible. Requires re-proving the password (same bar as an email
  // or password change), then removes the user, all their sessions, and
  // every synced row they own. Nothing is tombstoned — other devices just
  // start failing auth and keep working offline against their local copy.
  app.delete<{ Body: DeleteAccountBody }>('/account', { preHandler: requireAuth }, async (request, reply) => {
    const { currentPassword } = request.body ?? {};
    if (!currentPassword) {
      reply.code(400).send({ error: 'currentPassword is required' });
      return;
    }

    const user = getUserById(app.db, request.userId!);
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      reply.code(401).send({ error: 'Current password is incorrect' });
      return;
    }

    deleteAccount(app.db, user.id);
    reply.code(204).send();
  });
};
