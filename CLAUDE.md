# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint (flat config, `eslint.config.js`)

There is no test suite/runner configured in this project.

## Architecture

This is **Pantagon Tasks** ("my-todo") — a single-user React 19 + Vite PWA todo app backed by Supabase. No routing library; `src/App.jsx` holds all top-level state and conditionally renders views/sheets.

### Backend: Supabase (not fully in this repo)

- Client is created in [src/lib/supabase.js](src/lib/supabase.js) with a hardcoded project URL + anon key (project ref `bduvbthlqywpqhtaiznj`).
- Data access lives in [src/lib/todos.js](src/lib/todos.js): thin CRUD wrappers (`fetchTodos`, `fetchCategories`, `createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`, `createCategory`) around two tables, `todos` and `todo_categories`.
- Category color for the category named "Aware" is force-overridden to `#f87171` client-side regardless of what's stored in the DB (`overrideCategoryColor` in todos.js) — this is intentional, not a bug.
- Category display order is controlled by the `PREFERRED_ORDER` array in todos.js, not alphabetically/by DB order.
- **The push-notification backend (`send-push-notifications` Supabase Edge Function + a `pg_cron` job firing every 15 minutes) lives only in the Supabase project, not in this git repo.** There is no `supabase/functions/` directory here. To inspect or modify it, use the Supabase MCP tools (`list_edge_functions` / `get_edge_function` / `deploy_edge_function` / `execute_sql` against `cron.job`) against project id `bduvbthlqywpqhtaiznj`, org "Pantagon". Time-of-day logic in that function computes Bangkok time by adding a 7h offset to `Date.now()` and then reading `getUTCHours()`/`getUTCMinutes()` — the resulting `hour`/`minute` are already Bangkok-local, not UTC, which is a common source of off-by-timezone bugs there.

### Notifications: two independent systems

1. **Real background push** — handled entirely server-side by the Supabase Edge Function above via the Web Push API. The service worker's push handler is [public/sw-push.js](public/sw-push.js), injected into the generated Workbox service worker via `importScripts` in [vite.config.js](vite.config.js).
2. **Client-side `checkAndNotify`** in [src/lib/notifications.js](src/lib/notifications.js) — despite containing full logic for quiet hours, due-soon alerts, and morning/evening summaries, it is currently only ever invoked with `isTest = true` (see `triggerTestNotification` in [src/App.jsx](src/App.jsx)), i.e. it only powers the Settings "Test Notification" button. The elaborate scheduling branches in that function are effectively dead code in production — don't assume they run.

Push subscription happens via `subscribePush`/`enableNotifications` in notifications.js, which upserts `{ endpoint, p256dh, auth }` into the `push_subscriptions` Supabase table (`onConflict: 'endpoint'`).

### Settings & theming

- App settings (`notificationsEnabled`, `soundEnabled`, `theme`) are defined in [src/lib/settings.js](src/lib/settings.js) (`DEFAULT_SETTINGS`) and persisted to `localStorage` under the key `pantagon_settings`, read/written independently in both `App.jsx` and `SettingsView.jsx` (merged over `DEFAULT_SETTINGS` on load in both places — keep them in sync if the shape changes).
- Theme is applied by setting a `data-theme` attribute on `document.documentElement`, driven by `settings.theme` (`'dark'` | `'light'`).
- `playCompletionSound` in settings.js synthesizes a chime via the Web Audio API (no audio asset files).

### Components

Each component under `src/components/` pairs a `.jsx` file with a CSS Module of the same name (e.g. `TodoItem.jsx` + `TodoItem.module.css`). `App.jsx` toggles between the task list view and `CalendarView` via `viewMode` state rather than a router; `AddTodoSheet` and `SettingsView` are rendered as overlay sheets conditionally mounted based on boolean state.

### PWA build

PWA manifest/service-worker generation is configured in [vite.config.js](vite.config.js) via `vite-plugin-pwa` (`generateSW` strategy, `registerType: 'autoUpdate'`). Supabase REST calls are cached with a `NetworkFirst` runtime caching rule.
