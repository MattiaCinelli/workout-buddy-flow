# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versioning covers the app in `src/` and the optional sync server in `server/`
together — a single tag `vX.Y.Z` releases both.

## [1.0.9] - 2026-09-20

## [Unreleased]

### Added

- **Alternating-side exercise sets** — exercises can use an Alternate direction pattern for movements performed left, right, left, right within one set. Workout creation, editing, guided labels and voice cues, backups and sync all support the new pattern; Cossack Squat now uses it by default.

### Changed

- **Richer workout exercise search** — exercise pickers now search canonical names, aliases, target muscle groups, required equipment, category and difficulty. A search such as “wrist” therefore finds both exercises named for the wrist and exercises assigned to a wrist-related muscle group.
- **Accurate workout-card summaries** — workout-library cards replace the template date and stale stored duration with the number of unique exercises and a duration calculated from configured sets and rests. Durations retain seconds when needed, such as `2m 45s`.

### Fixed

- **Exercise-library data audit** — completed instructions and muscle targets for every active exercise, corrected classifications, names and prescriptions for the affected mobility and strength movements, restored Bodyweight Squat (without an image for now) for the six Wet Noodle workouts that referenced it, and removed all dangling workout-to-exercise references.
- **Accurate stored workout durations** — workout creation, editing and sync repair now persist duration from the actual exercise timing, repetition pace, unilateral sides and configured rests instead of the old 2.5-minutes-per-set estimate.
- **Private exercise-media migration** — moved legacy base64 exercise images out of synchronized records into authenticated private-media files; future inline JPEGs are converted automatically during sync.
- **Fast Refresh reliability** — removed the seven mixed component/non-component module exports that caused development reload warnings.
- **Portable visual-regression checks** — normalize full-page capture dimensions and account for Chromium's measured Linux font-rasterization variance while retaining stricter comparison against the macOS-authored baselines.
- **Workout exercise-picker continuity** — adding an exercise while creating or editing a workout keeps the Exercise Library tab, current search and browsing position open instead of jumping to Selected Exercises after every choice.
- **Repeatable workout exercise blocks** — the same exercise can now be added multiple times, moved and configured independently, and retains its exact block order through save, sync and reload. A Duplicate action copies an exercise block with all of its set settings for quickly inserting interludes such as Wrist Roll between every wrist stretch.
- **Empty-workout launch error** — starting a workout with no exercises now returns to its editor with a specific instruction to add an exercise instead of entering the player or showing a generic error.
- **Zero-second workout transitions** — setting rest between sets or exercises to zero now moves directly to the next exercise instead of stopping indefinitely on a `0:00` rest screen.
- **Five-minute wrist workout data** — corrected Wrist-Biceps Stretch from repetitions to timed holds, repaired the wrist workout’s set prescriptions and replaced its erroneous 18-minute estimate.
- **Wrist Push-Up exercise** — added a 10-repetition wrist-strengthening exercise with separate palms-down Forward and palms-up Backward variations, detailed safety cues and a private reference image.
- **Combined direction images** — exercises that vary by both side and orientation now use explicit Left–Forward, Right–Forward, Left–Backward and Right–Backward sets and image slots, so the guided workout always shows the correct demonstration.
- **Rotational Hinge exercise** — added the two-position kettlebell strength movement with 10-repetition left/right sets, detailed technique cues and a private exercise image.
- **Data-context Fast Refresh** — separated the shared `useData` hook from the React provider component so development updates no longer invalidate the entire context module.

## [1.0.8] - 2026-09-18

### Changed

- Folder containing workouts can be sync.

## [1.0.7] - 2026-09-15

### Added

- **Zero to Wet Noodle course** — adds a six-week Monday–Friday beginner flexibility course with 30 guided workouts. Timed movements use two 30-second sets and active movements use two sets of 13 repetitions, including direction-specific work where appropriate.
- **Seven course movements** — adds Half-Split Stretch, Adductor Rock-Back, Side Leg Raise, Child's Pose with Side Reach, Reverse Lunge, Full-Range Calf Raise and Overhead Reach with beginner guidance, searchable aliases, defaults and private demonstration photographs.

### Changed

- **Exercise duplication restored** — any exercise detail card can be duplicated with its media, instructions, equipment, defaults and collection membership intact. Copies receive a collision-free name and open immediately for editing.
- **Exercise variations removed** — exercises are once again independent cards with their own names, pictures, notes and workout identity. The variation editor, selectors, stacked variation cards, sync fields and workout-runtime handling have been removed.
- **Consistent exercise colours** — compact exercise tiles now keep the same category-tinted background and border used by exercise list cards.
- **Exercise sorting** — the Exercise Library is alphabetical by default and remembers the user's A–Z or Z–A choice across list and tile layouts.
- **Alias-aware search everywhere** — every exercise picker, the Exercise Library, My Workouts and workout history now recognize alternative exercise names. Workout-level searches also find cards and completed sessions containing an exercise whose canonical name or alias matches the query.
- **Nested workout folders** — My Workouts can create, rename and delete folders independently from courses, and any folder can contain subfolders with breadcrumb navigation. Workout and folder cards are draggable: drop workouts or entire folder trees into another folder, move them to a parent, or return them to the main library. Cyclic folder moves are rejected and deleting a folder safely keeps its workouts. Assignments are preserved in backups and self-hosted sync.
- **First-class exercise collections** — related movements can be assigned the same collection name and ordered by level. Each member remains a complete exercise with its own identity, name, picture, notes and history, while the Exercise Library collapses the family behind its first card to keep the list clean. Workout selection and execution therefore use the exact chosen exercise rather than a base-exercise label.
- **Exercise equipment tags** — exercises can now be assigned one or more equipment requirements, display them in list and tile library views, filter or search the library by equipment, and preserve them through backup and self-hosted sync. The Exercise Library presents Muscle Groups and Equipment side by side, each with a manager for adding, renaming and deleting choices; changes safely retag affected exercises.
- **Shorter workout rest defaults** — new workouts now default to 5 seconds between sets of the same exercise and 15 seconds when transitioning to another exercise.
- **Visual week-by-week course builder** — course creation and editing now present day cards grouped by week. Each day can reuse a library workout or open the full workout creator in place; newly created workouts are assigned to the chosen week and day automatically, while the detailed schedule remains available for instructions and same-day ordering.
- **Clearer workout exercise order** — selected exercises now show their numbered workout position in both the workout creator and existing-workout editor. The editor also displays the same compact exercise thumbnail above the Remove button as the creator.
- **Canonical exercise-name uniqueness** — duplicate primary exercise names are rejected case-insensitively across UI and data-layer creation paths, while aliases remain searchable and may overlap other aliases or primary names. Existing duplicates are reconciled on load: built-in records take precedence, workout and history references are redirected, and redundant records are removed safely.
- **All exercise media private** — legacy SVG illustrations now use the authenticated private-media pipeline alongside JPEG and GIF assets. Container deployments mount the Git-ignored exercise-media directory read-only instead of publishing exercise images in the web bundle.

### Fixed

- **Persistent PWA update reminders** — dismissing the new-version notification now snoozes it instead of permanently hiding it; pending updates are offered again after 30 minutes or when the app returns to the foreground.
- **Actionable sync failures** — sync errors shown in Settings now identify the collection that failed, such as Exercises, Courses or Scheduled Workouts.
- **Exercise search clearing** — the Exercise Library search field now provides an accessible clear button whenever it contains text.
- **Existing-install course seeding** — seed version 8 additively installs the new exercises, workouts and course without replacing user-created records.

## [1.0.6] - 2026-09-14

### Changed
- Increase max load for sync.

## [1.0.5] - 2026-09-11

### Added

- **Selected-exercise thumbnails** — the workout creator now shows each exercise image above its Remove button, making the selected list easier to scan while configuring sets.
- **Standing Pancake and Hurdler stretches** — added two 30-second, two-set flexibility cards with demonstration links, muscle targets, technique guidance and private studio photographs. Hurdler Stretch provides distinct left- and right-side sets.
- **One-off exercise trials** — start an exercise directly from its library detail, using its configured sets, repetitions or duration, direction-specific sets, rests and guided cues. Trial completion can restart or return to the library and never creates workout history, personal records or progression data.
- **Restart active exercise** — the guided player can reset the current exercise set and its timer without leaving or restarting the rest of the workout.
- **Full-screen exercise images** — tapping an image in an exercise detail card opens an aspect-ratio-preserving phone-safe viewer; Close or Back returns to the exercise card.

### Changed

- **Focused workout targets** — personal-best values are no longer shown during an active workout; they remain available on the Progress screens.
- **Workout editing flow** — successfully saving an edited workout now closes the editor and returns to the workout library.
- **Back-button behavior** — browser and Android Back now close the top open detail card, form, menu or confirmation before navigating away from its underlying page.

### Fixed

- **Private exercise images offline** — sync now prefetches private exercise images into persistent device storage. Once downloaded, photographs and GIFs remain visible without the server and across app restarts, update efficiently when the server file changes, and leave the cache only when manually removed.
- **Dark-theme exercise media** — guided-workout image frames no longer force a white background when an image uses `object-contain` or does not match the frame's aspect ratio.
- **Phone system-bar spacing** — the top navigation now respects Capacitor and browser safe-area insets, keeping sync, account and menu controls below status-bar indicators; bottom workout controls and toasts use the matching navigation-bar inset.
- **Exercise detail sizing** — exercise details use the full available phone height with scrollable content and a fixed action area, preventing Progress, Share, Edit or Try exercise from being clipped outside the popup.

## [1.0.4] - 2026-09-10

### Added

- **Exercise aliases** — exercises can store alternative names, display them in the library and detail view, and match them in search. Aliases are deduplicated, checked for naming conflicts, backed up and synced.
- **Animated private exercise media** — private exercise illustrations can now use looping GIFs; Neck rolls includes a controlled movement demonstration.
- **Optional Starship interface** — users can choose a futuristic console-style interface or the original Classic design from Settings. Classic remains the default, both interfaces support distinct light and dark palettes, and compact previews make the choices easier to compare.
- **Appearance regression coverage** — automated WCAG AA audits now check contrast, accessible labels, keyboard navigation and visible focus states in every interface/color combination. Portable screenshot baselines guard all four appearances against unintended visual changes.

### Changed

- **Complete exercise guidance** — every active exercise in the local sync library now includes instructions and at least one valid muscle-group assignment; existing populated fields, workout plans and history are preserved.
- **Post-workout destination** — saving the final workout in a sequence now returns to the homepage; consecutive workouts on the same course day still continue seamlessly into the next session.
- **Focused guided workouts** — active workouts no longer show when an exercise was last performed or display set details from its previous session. Personal records and progression suggestions remain available without exposing the previous-session report.
- **Matching browser chrome** — browser and installed-PWA theme colors now track Classic Light, Classic Dark, Starship Light and Starship Dark dynamically.

### Fixed

- **Appearance startup and accessibility** — saved interface and color choices are applied on every route before the first render, avoiding reload flicker. Light-palette warning, muted and selected-control colors now meet WCAG AA contrast requirements, and interface fonts no longer require a network request.

## [1.0.3] - 2026-09-10

### Added

- **Mobility exercise cards** — added or upgraded Cat-Cow, Open-Book Rotations, Deep Squat Hold, Half-Kneeling Hip-Flexor Stretch, Hamstring Stretch, Frog Stretch, Butterfly, Figure-4 Stretch, Puppy Pose, Supported Straddle, Cossack Squat and Straight-Leg Raises. Each starter exercise includes its action areas, researched instructions, two-set defaults, a demonstration link and an inclusive fitness-editorial photograph served privately by the optional sync server. Existing exercise records are reused where the movement was already present, avoiding duplicate cards.
- **Expanded mobility library** — added 90/90 Hip Switches, Pigeon Pose, Single-Leg Deadlift-Position Stretch, Reclined Hamstring Stretch with Strap, Side Lunge Hold, Doorframe Lat Stretch, Sleeper Stretch, Knee-to-Wall Ankle Mobilization, Bent-Knee Soleus Stretch, Downward Dog with Heel Pumps, Thread the Needle and Foam-Roller Thoracic Extension. Timed stretches default to two 30-second sets and active drills to two sets of 13 repetitions, with separate left/right sets where appropriate.

### Changed

- **Reviewed stretch cards and photography** — corrected Child's Pose and Cross-Body Shoulder Stretch to two 30-second sets, distinguished the straight-knee calf and bent-knee soleus variants, and replaced the remaining stick figures for Seated Forward Fold, Child's Pose, Downward Dog, Cross-Body Shoulder Stretch and Standing Calf Stretch. New photographs use varied adult trainers and outfit colors with natural, movement-focused gazes.
- **Private generated exercise media** — generated photographs are no longer bundled into the web app or tracked in Git. They live in the server's ignored `private/exercise-images` directory and are returned only to a client with a valid sync-session Bearer token.

### Fixed

- **Exercise demonstration-link sync** — video links now round-trip through the optional sync server instead of disappearing after a pull.
- **Current Node.js server startup** — updated the server's SQLite driver so it starts reliably on supported Node.js 24 and newer installations.

## [1.0.2] - 2026-09-06

### Added

- **Explicit course-day sequencing** — selecting days 1–5 creates a workout on each selected day without inventing rest-day entries. Multiple workouts can share one course day in a clear order, are placed consecutively on the calendar, and completing one opens the next same-day workout automatically.
- **Course calendar cleanup** — deleting a course workout from the calendar can remove only that calendar entry or every entry for the same workout from the selected date onward. Past entries, the course plan, workout template and completed history remain unchanged.
- **Directional exercise sets** — exercises can define left, right, forward and backward defaults. Adding one to a workout creates a separate, visible set for every selected direction, and each set's direction can be changed independently in the workout builder or editor. The guided workout displays and announces the active direction. Existing unilateral exercises and workouts remain compatible.

### Fixed

- **Responsive dialogs and notifications** — dialogs and confirmations now keep safe margins, scroll within short phone screens and stack rigid form layouts on narrow displays. Save/change notifications consistently appear at the bottom on phones and computers.
- **Workout exercise selection flow** — adding an exercise while creating a workout now keeps the Exercise Library open so several exercises can be added without repeatedly switching tabs.
- **One-limb exercise sync** — the sync server now persists the unilateral setting instead of dropping it and clearing the toggle on the next pull. Additive SQLite migrations preserve all existing exercises, workouts and history.

## [1.0.0] - 2026-09-02

First release. The app was usable and offline-capable throughout development; this is the point where the scope in `docs/overview.md` is complete, verified on the web and on a real Android device, and cut from a repeatable signed build.

### Added — core app (offline, no account required)

- **Exercise library** — create, edit and delete exercises with category, editable muscle-group tags, difficulty, a photo taken on the device, and an optional `https://` link to a demonstration video. Library cards are tinted by category for quick scanning.
- **One-limb-at-a-time exercises** — an exercise can be marked unilateral; the guided run then splits every set into a left side, a short switch pause, and a right side, and the builder shows each authored set as covering both sides.
- **Workout builder** — ordered sets of reps/weight or duration/distance with per-set rest, sensible defaults per exercise type, warm-up and AMRAP set flags, and preserved circuit/superset order.
- **Guided workout mode** — full-screen run with deadline-based timers that catch up after backgrounding, a screen wake lock, resume-after-interruption, and a completion chime. Optional spoken and haptic cues, with distinct prompts for switching sides, resting between sets, and changing exercise (the next exercise is named aloud). Optional background audio: a generated ambient bed or a user-supplied track.
- **Calendar** — weekly and monthly views; one-off, daily, or weekly multi-day recurring schedules; skip and restore individual occurrences; move a single occurrence without disturbing the series.
- **Courses** — week/day programs of repeatable workouts and recovery days with goals, difficulty, prerequisites and per-session notes; schedule an entire program from one start date; progress, next-session and restart tracking.
- **History & progress** — filterable completed-session history, streaks, weekly goal, charts, personal records, per-exercise progression suggestions, and a clear-history reset.
- **Body metrics** — dated body-weight log with BMI (height set once in settings).
- **Corrections** — edit or delete mistaken history records, undo a just-saved completion, and correct a session's details.
- **Accessibility** — large-text and reduced-motion preferences, voice and haptic toggles, screen-reader status announcements, phone-safe controls.
- **Light / dark / system theme.**
- **Backup & restore** — full-device JSON export/import (device preferences and the custom audio track included). Share a single exercise or workout as a self-contained file that merges into another library, remapping ids and reusing same-named entries.
- **Reminders** — local notifications for scheduled workouts with a configurable lead time (installed Android app).
- **PWA** — build-time-precached offline shell, installable, "update available" prompt rather than a silent swap.
- **Android app** — same build wrapped with Capacitor; signed APKs published to GitHub Releases on each `vX.Y.Z` tag, installing as data-preserving updates.

### Added — optional self-hosted sync server (`server/`)

- Node + Fastify + SQLite, packaged as an OCI container (built and run with Podman; the `Dockerfile` also works with Docker). No managed-cloud APIs.
- **Accounts are admin-created only** — no public signup endpoint. Passwords hashed with scrypt; sessions are opaque tokens stored only as a SHA-256 hash.
- **Sync** for all seven collections plus account-level settings (theme, accessibility, height). Pull-since-timestamp + push with last-write-wins per record; deletes are tombstones.
- **Automatic background sync** on app load, every 30s while open, and on return to the foreground, with exponential backoff after failures.
- **Conflict visibility** — a losing local edit is kept and can be re-applied from the Sync settings ("Keep mine" / "Dismiss").
- **Manual one-way sync** — "Push this device to server" and "Replace this device with server" overrides for when the automatic merge would do the wrong thing.
- **Self-service account management** — change display name, email or password; see how many other devices are connected and sign them all out; delete the account and all its server-side data (local data is untouched).
- **Admin password recovery** — `npm run reset-password -- <email>` on the server (there is no email/SMTP dependency by design).

### Security & privacy

- No third-party runtime code and no telemetry; the only outbound requests are to a sync server the user configures. The Lovable editor script is stripped from every production build.
- Imported backup/share files are validated per-record (Zod); `imageUrl` is restricted to `https:` or an `image/*` data URI and exercise `videoUrl` to a plain `https:` link; oversized files are rejected; CSV export escapes formula-injection characters.

### Known limitations

- Sync conflict resolution is whole-record last-write-wins, not field-level merge: two devices editing the _same field_ of the _same record_ while both offline can lose one side's edit. The losing edit is surfaced for manual recovery rather than silently dropped. Field-level merge / CRDTs are deliberately out of scope for 1.0.
- Plain-HTTP sync (a LAN server without TLS) is off by default in the Android build and must be enabled at build time WB_ALLOW_INSECURE_SYNC=1`); the token and data travel unencrypted on that network. Prefer an HTTPS sync server.

[Unreleased]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.8...HEAD
[1.0.8]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/MattiaCinelli/workout-buddy-flow/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/MattiaCinelli/workout-buddy-flow/releases/tag/v1.0.0
