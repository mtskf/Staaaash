# CLAUDE.md

> Quick reference for AI coding assistants

See `dev-docs/ARCHITECTURE.md` for implementation details, `dev-docs/SPEC.md` for features.

## Overview

Chrome extension: Tab group management dashboard. Opens via extension icon/keyboard shortcut.

**Tech**: Manifest V3 | React 19, TypeScript, Vite | Firebase RTDB, Google OAuth | Tailwind v3

**Entry Points**:

- UI: `src/App.tsx` → `src/features/dashboard/Dashboard.tsx`
- Background: `src/background/index.ts`

**Data Model**: See [`src/types/index.ts`](file:src/types/index.ts)

**Storage**: `chrome.storage.local` (offline-first, not `.sync`) + Firebase sync (3-way merge). Dev mode uses `localStorage`.

## Key Operations

1. **Archive**: Icon click or `⌥S` → save to local + open dashboard
2. **Restore**: Click group → open tabs in new window
3. **Sync**: Auto (UI init + 5s poll) → 3-way merge → Firebase

## Commands

- `pnpm run dev` - Development server (HMR)
- `pnpm run build` - Production build
- `pnpm run check` - Type check + test + lint (CI)
- `pnpm test` - Run tests (watch mode)

## Code Style

- TypeScript strict mode, no `any` types
- Use named exports, not default exports
- CSS: use Tailwind utility classes, no custom CSS files

## Constraints

- Firebase auth disabled in background (Service Worker: `import.meta.env.*` is `undefined`)
- Tailwind v3 only (v4 has PostCSS/shadcn issues)

- Dashboard opens via icon/shortcuts (not `chrome_url_overrides`)
