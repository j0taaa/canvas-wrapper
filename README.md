## Canvas Wrapper

A simple Canvas-like dashboard built with **Next.js**, **Bun**, and **shadcn/ui**.

### Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
bun run dev
```

Open http://localhost:3000.

### Environment variables

- `CANVAS_KEY` (recommended): Canvas API token.
- `CANVAS_API_KEY` (fallback): Alternative token variable name.
- `CANVAS_API_BASE` (optional): Defaults to `https://pucminas.instructure.com/api/v1`.

### PWA support

- App includes `manifest.webmanifest` and a service worker (`/sw.js`).
- Installable in browsers that support PWA install prompts.
- Static app assets are cached offline-first by the service worker.

### Data caching

- Canvas API requests use `force-cache` with revalidation.
- Dashboard data is memoized with Next.js `unstable_cache` and tags.
- Profile/courses/todo/dashboard cards revalidate every 5 minutes by default.

### Quick validation

```bash
CANVAS_KEY=your_token_here bun run dev
```

This app reads your profile, dashboard cards, active courses, and to-do list directly from Canvas API.
