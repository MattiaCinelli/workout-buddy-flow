import { openDb } from '../db';
import { getUserByEmail, updatePasswordHash } from '../db/users';
import { deleteAllSessionsForUser } from '../db/sessions';
import { hashPassword } from '../auth/password';
import { getDatabasePath } from '../config';
import { createPrompter } from './promptHidden';

const MIN_PASSWORD_LENGTH = 8;

// Password recovery for a self-hosted server: there is no email/SMTP and no
// self-service reset endpoint by design (see docs/self-hosted-sync.md), so
// the recovery mechanism is shell access to the server itself. This is the
// counterpart to create-user: it only touches an account that already
// exists, and it signs every device out (deletes all sessions) so the old
// password — and any token derived from it — stops working immediately.
const main = async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run reset-password -- <email>');
    process.exitCode = 1;
    return;
  }

  const db = openDb(getDatabasePath());

  const user = getUserByEmail(db, email);
  if (!user) {
    console.error(`No user with email ${email}. Use "npm run create-user -- ${email}" to create one.`);
    process.exitCode = 1;
    return;
  }

  const prompt = createPrompter();
  try {
    const password = await prompt.hidden('New password: ');
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      process.exitCode = 1;
      return;
    }

    const confirmation = await prompt.hidden('Confirm new password: ');
    if (password !== confirmation) {
      console.error('Passwords did not match.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(password);
    updatePasswordHash(db, user.id, passwordHash);
    deleteAllSessionsForUser(db, user.id);
    console.log(`Password reset for ${user.email} (${user.id}). All devices have been signed out and must reconnect.`);
  } finally {
    prompt.close();
  }
};

main().catch(error => {
  console.error('Failed to reset password:', error);
  process.exitCode = 1;
});
