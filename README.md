# Canvas Wrapper Monorepo

This repository is a monorepo with:

- `apps/web`: the Next.js web app
- `apps/mobile`: the React Native app built with Expo
- `packages/shared`: shared cross-platform types and pure utilities

The repo-level parity rules live in `AGENTS.md`. Web and mobile are expected to evolve together and stay feature-aligned.

## Setup

Install dependencies from the repo root:

```bash
bun install
```

## Development

Run the web app:

```bash
bun run dev:web
```

Run the mobile app:

```bash
bun run dev:mobile
```

Extra mobile shortcuts:

```bash
bun run ios:mobile
bun run android:mobile
bun run typecheck:mobile
```

## Structure

```text
apps/
  mobile/   Expo + React Native app
  web/      Next.js app
packages/
  shared/   Shared cross-platform helpers
```

## Web build and validation

From the repo root:

```bash
bun run lint
bun run build
```

## Docker

The Docker setup builds and runs the web app from the monorepo root:

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

The app can work without fixed env credentials because users can connect with their own Canvas URL and API token in the UI, but these server-side envs are still supported:

- `CANVAS_KEY`
- `CANVAS_API_KEY`
- `CANVAS_API_BASE`

## Notes

- The shared package is the right place for domain types, formatters, and pure mapping logic used by both apps.
- Platform-specific UI and native integrations should stay inside `apps/web` or `apps/mobile`.
- The mobile app is an Expo + React Native shell around the real web app so mobile and web stay in lockstep on features, behavior, and design.
- Set `EXPO_PUBLIC_WEB_APP_URL` for the mobile app, or enter the website URL on first launch inside the app.
