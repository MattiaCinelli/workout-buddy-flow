# Development guide

## Running locally

```sh
npm install
npm run dev        # Vite dev server
npm run build      # production build into dist/
```

## Project layout

```text
src/
  pages/         one file per route (see docs/architecture.md)
  components/    shared UI
    calendar/    monthly & weekly views, schedule modals
    dashboard/   calendar preview, today's focus, streak, weekly goal, quick stats
    ui/          shadcn/ui primitives (generated — avoid hand-editing)
  contexts/      DataContext: the single app-wide state provider
  hooks/         one hook per domain collection + useTheme / use-toast / use-mobile
  data/          TypeScript types and seed data
  lib/db.ts      IndexedDB access helpers
  index.css      design tokens (colours, radii, dark theme)
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

## Packaging for Android (Capacitor)

`capacitor.config.ts` points at `dist` as the web directory. On a machine with Android
Studio installed:

```sh
npm run build
npx cap add android      # first time only
npx cap sync android
npx cap run android      # or open the project in Android Studio to build an APK
```

IndexedDB works inside the Capacitor WebView, so the entire database ships with the
app and persists across restarts and updates — no server required.

## Gotchas seen in this codebase

- **Duplicate items after create** — usually a hook both `push`-ing locally *and*
  refetching. Pick one; the hooks currently update state optimistically after the DB
  write.
- **"Workout not found"** — a page reading the static array from `src/data/` instead of
  `useData()`.
- **A page renders white in dark mode** — a hardcoded Tailwind grey somewhere on that
  page's root element.
