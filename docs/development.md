# Development guide

## Running locally

Install **Node.js 22 LTS** before running the project. `npm` is included with Node.

```sh
npm install
npm run dev        # Vite dev server
npm run build      # production build into dist/
```

## Quality checks

Run these before handing off a change:

```sh
npm run lint                         # ESLint; generated UI may emit non-blocking warnings
npx tsc --noEmit -p tsconfig.app.json
npm run build
npm run test:e2e
```

Playwright uses Chromium. Install its browser once if necessary:

```sh
npx playwright install chromium
```

End-to-end tests live in `e2e/`. The configuration starts Vite automatically on
`127.0.0.1:4173` and uses a fresh browser context for each test.

`e2e/accessibility-mobile.spec.ts` exercises the Settings page at 360×640, the guided
workout controls at 320×568, system reduced-motion behavior, large text and horizontal
overflow. When changing navigation, Settings or guided mode, keep these narrow-phone
checks passing and manually inspect at least one landscape viewport on Android.

## Unit / hook tests

`npm run test:unit` (Vitest). Files run in the Node environment by default; a
component or hook test opts into a DOM with a `// @vitest-environment jsdom` docblock
and uses `@testing-library/react`. `src/test/setup.ts` registers the jest-dom
matchers. Pure logic lives in `src/lib/*` with a sibling `*.test.ts` — prefer
extracting logic there over testing it through a component.

## Working on the sync server

`server/` has its own `package.json` and test suite, independent of the app above:

```sh
cd server
npm install
npm test           # node:test via tsx
npx tsc --noEmit
```

See `docs/self-hosted-sync.md` for what's built so far, what's next, and the design
decisions behind it.

## Project layout

```text
src/
  pages/         one file per route (see docs/architecture.md)
  components/    shared UI
    calendar/    monthly & weekly views, schedule modals
    dashboard/   calendar preview, today's focus, streak, weekly goal, quick stats
    ui/          shadcn/ui primitives (generated — avoid hand-editing)
  contexts/      DataContext: the single app-wide state provider
  hooks/         one hook per domain collection, including completed sessions
  data/          TypeScript types and seed data
  lib/db.ts      IndexedDB access helpers
  index.css      design tokens (colours, radii, dark theme)

server/          optional self-hosted sync backend — separate package.json,
                 not part of the Vite build. See docs/self-hosted-sync.md.
```

## How to add a feature

**A new field on an existing entity**
1. Add it to the interface in `src/data/*.ts` (optional field = no migration needed).
2. Surface it in the create/edit modal.
3. Render it where relevant. Old records simply have it `undefined`.

**A new entity / object store**
1. Define the type in `src/data/`.
2. In `src/lib/db.ts`: add it to `WorkoutBuddyDB`, bump `DB_VERSION`, add a guarded
   `createObjectStore` in `upgrade`, and add the CRUD helpers.
3. Write a `useX` hook mirroring `useCourses` (load on mount, write-then-setState).
4. Expose it through `DataContext`.
5. Build the pages/components on top of `useData()`.

Never reuse an existing store for a concept with a different lifecycle. In particular,
workout templates are editable plans while workout sessions are historical snapshots.

**A new page**
1. Create it in `src/pages/`.
2. Register the route in `src/App.tsx` *above* the `*` catch-all.
3. Add a link in `src/components/Navbar.tsx` if it is a primary destination.

## Conventions

- Use `useData()` — never import from `src/lib/db.ts` inside a component.
- Write to IndexedDB **before** updating React state, so a failed write cannot leave
  the UI showing data that was not persisted.
- Only semantic colour tokens (`bg-background`, `text-foreground`, `bg-muted`,
  `text-muted-foreground`, `bg-primary`, …). Never `bg-gray-50`, `text-white`, or
  arbitrary hex values — they break the dark theme.
- Destructive actions (delete exercise/workout/course, clear history) must go through
  an `AlertDialog` confirmation.
- Keep dates as ISO strings in storage; format for display with `date-fns`.
- Preserve the flat order of `WorkoutSet[]`; grouping sets globally changes circuits
  and supersets.
- Use a course item's unique `id` for progress. `workoutId` is not unique because the
  same template may appear multiple times in one program.
- Add or update an end-to-end test for user-visible workflows.

## Packaging for Android (Capacitor)

`capacitor.config.ts` points at `dist` as the web directory. Android builds require:

- Android Studio and the Android SDK
- Android SDK Build-Tools 35.0.0
- Java 21 (Android Studio includes a compatible runtime)

Native integrations currently use `@capacitor/local-notifications`,
`@capacitor/filesystem`, and `@capacitor/share`. Run `npx cap sync android` after any
plugin installation or web build so Gradle and native assets stay synchronized.

On macOS, expose Android Studio's Java runtime to Gradle:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Add the two exports to `~/.zshrc` to make them persistent. Then build and synchronize:

```sh
npm run build
npx cap add android      # first time only; skip when android/ already exists
npx cap sync android
npx cap run android      # or open the project in Android Studio to build an APK
```

Always run `npm run build` before `cap sync`; Capacitor copies the current `dist/`
contents into the native project.

IndexedDB works inside the Capacitor WebView, so the entire database ships with the
app and persists across restarts and updates — no server required.

### Publishing an installable APK on GitHub

The `Android release` GitHub Actions workflow builds and publishes a signed APK when
a semantic-version tag such as `v0.2.0` is pushed. Signing requires a one-time setup.

Generate the signing key somewhere outside this repository and keep it permanently:

```sh
keytool -genkeypair -v \
  -keystore workout-buddy-release.jks \
  -alias workout-buddy \
  -keyalg RSA -keysize 2048 -validity 10000
```

Never commit the `.jks` file or its passwords. Back it up securely: losing it means
new releases cannot update existing installations. In the GitHub repository, open
**Settings → Secrets and variables → Actions** and create these repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Output of `base64 < workout-buddy-release.jks | tr -d '\n'` |
| `ANDROID_KEYSTORE_PASSWORD` | Password chosen for the keystore |
| `ANDROID_KEY_ALIAS` | `workout-buddy` (or the alias chosen above) |
| `ANDROID_KEY_PASSWORD` | Password chosen for the key |

Then publish a release:

```sh
git tag v0.2.0
git push origin v0.2.0
```

When the workflow finishes, GitHub creates a Release containing
`workout-buddy-v0.2.0.apk`. Users can download it from the repository Releases page.
Use a new, increasing semantic version for every release. The workflow uses GitHub's
monotonically increasing run number as Android's internal version code.

### Android troubleshooting

**`Unable to locate a Java Runtime`**

Set `JAVA_HOME` to Android Studio's bundled `jbr` directory as shown above, then open
a new terminal or run `source ~/.zshrc`.

**`ZipException: invalid block type` while installing Build-Tools 35**

The SDK archive is corrupt or partially extracted. In Android Studio, open
**Tools → SDK Manager → SDK Tools**, enable **Show Package Details**, uninstall
**Android SDK Build-Tools 35.0.0**, apply, then install 35.0.0 again.

The Gradle `flatDir` messages are warnings and are not the cause of that failure.

## Gotchas seen in this codebase

- **Duplicate items after create** — usually a hook both `push`-ing locally *and*
  refetching. Pick one; the hooks currently update state optimistically after the DB
  write.
- **"Workout not found"** — a page reading the static array from `src/data/` instead of
  `useData()`.
- **A page renders white in dark mode** — a hardcoded Tailwind grey somewhere on that
  page's root element.
- **History changes when a template is created** — history must read `sessions`, not
  `workouts`.
- **A repeated course workout completes twice** — completion must use `courseItemId`,
  not `workoutId`.
- **Delete fails with a reference message** — remove the workout/exercise from the
  listed templates, courses or calendar entries, and clear dependent history only if
  the user truly wants to discard it.

## Manual release checklist

1. Create and edit an exercise, including a local image.
2. Build a workout with an interleaved circuit and confirm guided mode preserves order.
3. Finish the workout and verify exactly one history entry and updated progress stats.
4. Create a multi-week course containing a repeated workout and a recovery day.
5. Schedule the course and verify workout dates match their week/day positions.
6. Complete the next course workout through guided mode and confirm only that item
   advances.
7. Confirm referenced exercises/workouts cannot be deleted silently.
8. Check weekly and monthly calendars, light/dark themes, and a narrow mobile viewport.
9. Run the quality-check commands above.
10. Build, sync and launch the Android package on an emulator or device.
