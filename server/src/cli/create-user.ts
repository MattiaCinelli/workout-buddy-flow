import { openDb } from '../db';
import { getUserByEmail, createUser } from '../db/users';
import { hashPassword } from '../auth/password';
import { getDatabasePath } from '../config';
import { createPrompter } from './promptHidden';

const MIN_PASSWORD_LENGTH = 8;

// The only way to create an account: run on the server itself. There is no
// HTTP registration endpoint, deliberately — see docs/self-hosted-sync.md.
const main = async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run create-user -- <email>');
    process.exitCode = 1;
    return;
  }

  const db = openDb(getDatabasePath());

  if (getUserByEmail(db, email)) {
    console.error(`A user with email ${email} already exists.`);
    process.exitCode = 1;
    return;
  }

  const prompt = createPrompter();
  try {
    const password = await prompt.hidden('Password: ');
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      process.exitCode = 1;
      return;
    }

    const confirmation = await prompt.hidden('Confirm password: ');
    if (password !== confirmation) {
      console.error('Passwords did not match.');
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(db, email, passwordHash);
    console.log(`Created user ${user.email} (${user.id}).`);
  } finally {
    prompt.close();
  }
};

main().catch(error => {
  console.error('Failed to create user:', error);
  process.exitCode = 1;
});
