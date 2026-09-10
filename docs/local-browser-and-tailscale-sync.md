# Run Workout Buddy locally and sync through Tailscale

This guide uses three separate addresses:

| Purpose | Address |
| --- | --- |
| App in the Mac browser | `http://localhost:8081` |
| Sync server on the Mac | `http://127.0.0.1:3001` |
| Sync server for both devices | `https://mattias-macbook-pro.taild9aa5c.ts.net` |

The frontend and sync server are different processes. Only the sync server is
published through Tailscale. Obsidian may continue using its own ports.

## 1. Check that the ports are available

Run:

```sh
lsof -nP -iTCP:8081 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

No output means the port is available. If Obsidian or another application is
already using `8081`, choose another frontend port such as `8082`. The frontend
port does not need to match the sync-server port.

If an old Workout Buddy process is already listening on one of these ports, you
can either keep using it or return to its terminal and press `Ctrl+C` before
starting it again.

## 2. Open the app in the computer browser

Open Terminal 1 and run:

```sh
cd /Users/mattiacinelli/repos/workout-buddy-flow
npm install
npm run dev -- --host 127.0.0.1 --port 8081
```

Keep Terminal 1 open. Visit this plain address in the Mac browser:

```text
http://localhost:8081
```

Do not add `/health`: that endpoint belongs to the sync server, not the app.

If you selected port `8082` because `8081` was occupied, open
`http://localhost:8082` instead.

> Choose one frontend port and keep using it. Browser data is stored per origin,
> so `localhost:8081` and `localhost:8082` have separate local databases. Changing
> ports can make the app look empty, but it does not delete the data stored under
> the original address. Syncing both origins to the same server can restore the
> shared records.

## 3. Start the sync server

Open Terminal 2 and run:

```sh
cd /Users/mattiacinelli/repos/workout-buddy-flow/server
npm install
PORT=3001 npm run dev
```

Keep Terminal 2 open. It should report:

```text
Workout Buddy sync server listening on 0.0.0.0:3001
```

Test it locally with:

```sh
curl http://127.0.0.1:3001/health
```

Expected response:

```json
{"status":"ok"}
```

If you have not created a sync account yet, stop the server temporarily with
`Ctrl+C`, run the following command, and then start it again:

```sh
npm run create-user -- you@example.com
PORT=3001 npm run dev
```

The account command asks for a password without displaying it.

### Private exercise photographs

The generated exercise photographs live in
`server/private/exercise-images/`. The whole `server/private/` directory is
ignored by Git, so the files do not appear on GitHub. Keep this directory on the
Mac and include it in your own local backup.

The app downloads these photographs through the authenticated sync connection.
Consequently, the browser and phone must be connected to the server to display
them. The exercise data itself and the rest of the app continue to work offline.
If you move the server, copy this private directory to the new machine and set
`EXERCISE_MEDIA_DIR` if you store it somewhere else:

```sh
EXERCISE_MEDIA_DIR=/absolute/private/path PORT=3001 npm run dev
```

## 4. Connect Tailscale on the Mac and phone

Open the Tailscale application on the Mac and select **Connect**. Open Tailscale
on the phone as well. Both devices must be signed into the same tailnet.

Check the Mac connection in Terminal 3:

```sh
tailscale status
```

If this says `Tailscale is stopped`, start or reconnect the Mac Tailscale app
before continuing.

## 5. Publish only the sync server through Tailscale

In Terminal 3 run:

```sh
tailscale serve --bg 3001
tailscale serve status
```

The status should show:

```text
https://mattias-macbook-pro.taild9aa5c.ts.net/
|-- proxy http://127.0.0.1:3001
```

If it still points to an old port, replace the old Serve configuration:

```sh
tailscale serve reset
tailscale serve --bg 3001
tailscale serve status
```

Test the Tailscale address first on the Mac and then on the phone:

```text
https://mattias-macbook-pro.taild9aa5c.ts.net/health
```

Both should display `{"status":"ok"}`. A `404` at the address without
`/health` is harmless—the server has no homepage.

## 6. Connect both copies of Workout Buddy

On the Mac browser app:

1. Open **Settings**.
2. Open the sync section.
3. Enter this server URL, without `/health`:

   ```text
   https://mattias-macbook-pro.taild9aa5c.ts.net
   ```

4. Enter the sync-account email and password.
5. Select **Connect server**.

Repeat those steps in the installed phone app using exactly the same URL and
account. Both apps now sync through the same server. The browser itself remains
at `http://localhost:8081`; it does not need to be served by Tailscale.

## Normal startup after the first setup

On later days, the short version is:

Terminal 1:

```sh
cd /Users/mattiacinelli/repos/workout-buddy-flow
npm run dev -- --host 127.0.0.1 --port 8081
```

Terminal 2:

```sh
cd /Users/mattiacinelli/repos/workout-buddy-flow/server
PORT=3001 npm run dev
```

Then ensure Tailscale is connected on both devices. Because `tailscale serve`
was started with `--bg`, its configuration normally remains active. Confirm it
with:

```sh
tailscale serve status
```

## Troubleshooting

### `Failed to connect to 127.0.0.1 port 3001`

The sync server is not running. Start Terminal 2 again. Do not test the frontend
port with `/health`.

### `Tailscale is stopped`

Open the Tailscale application on the Mac and connect it. Also confirm that the
phone's Tailscale connection is active.

### The phone reports `Failed to fetch`

Check these in order:

1. `curl http://127.0.0.1:3001/health` works on the Mac.
2. `tailscale serve status` proxies to `http://127.0.0.1:3001`.
3. The Tailscale `/health` URL opens on the phone.
4. Workout Buddy stores the HTTPS base URL without `/health`.
5. Mac and phone are connected to the same tailnet.

### Obsidian is already using port 8081

Start only the frontend on another port:

```sh
npm run dev -- --host 127.0.0.1 --port 8082
```

Open `http://localhost:8082`. Keep the sync server on `3001` and keep the same
Tailscale sync URL.
