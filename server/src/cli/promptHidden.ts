import readline from 'node:readline';

// Defined via fromCharCode rather than string literals so no raw control
// bytes are embedded in this source file (invisible/fragile across editors
// and diffs) — these are Ctrl-C, Ctrl-D, and Backspace/DEL respectively.
const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);
const BACKSPACE = String.fromCharCode(127);

export interface Prompter {
  hidden(question: string): Promise<string>;
  close(): void;
}

// One Prompter per CLI run, reused across multiple prompts — creating a
// fresh readline.Interface per question is unsafe for piped/non-interactive
// input: the first interface can read ahead and consume more of the stream
// than just its own line, so a second interface created afterward sees an
// already-drained stream and its prompt never resolves.
export const createPrompter = (): Prompter => {
  if (!process.stdin.isTTY) {
    // No terminal to mask input on anyway (piped input in a script, or a
    // non-interactive `docker exec`), so fall back to plain readline.
    //
    // Deliberately not rl.question() wrapped in a Promise: when piped input
    // delivers multiple lines in one underlying chunk, readline emits their
    // 'line' events synchronously back-to-back. rl.question()'s callback
    // resolves a Promise, and the awaiting code only resumes on the next
    // microtask — one tick too late to have a listener in place for the
    // second 'line' event, which is then lost and the prompt hangs forever.
    // Listening to 'line' persistently and queueing values eagerly (matched
    // against requests as they come in) sidesteps that ordering entirely.
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const lines: string[] = [];
    const waiters: ((line: string) => void)[] = [];
    rl.on('line', line => {
      const waiter = waiters.shift();
      if (waiter) waiter(line);
      else lines.push(line);
    });
    return {
      hidden: question => {
        process.stdout.write(question);
        return new Promise(resolve => {
          const buffered = lines.shift();
          if (buffered !== undefined) resolve(buffered);
          else waiters.push(resolve);
        });
      },
      close: () => rl.close(),
    };
  }

  const stdin = process.stdin;
  return {
    hidden: question => new Promise((resolve, reject) => {
      process.stdout.write(question);
      stdin.resume();
      stdin.setEncoding('utf8');
      stdin.setRawMode(true);

      let input = '';
      const finish = () => {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
      };
      const onData = (char: string) => {
        switch (char) {
          case '\n':
          case '\r':
          case CTRL_D:
            finish();
            process.stdout.write('\n');
            resolve(input);
            break;
          case CTRL_C:
            finish();
            reject(new Error('Cancelled'));
            break;
          case BACKSPACE:
          case '\b':
            input = input.slice(0, -1);
            break;
          default:
            input += char;
            break;
        }
      };
      stdin.on('data', onData);
    }),
    close: () => {},
  };
};
