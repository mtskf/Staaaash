# CLAUDE.md

> Quick reference for AI coding assistants

See `dev-docs/ARCHITECTURE.md` for implementation details, `dev-docs/SPEC.md` for features.

## Overview

Chrome extension: Tab group management dashboard. Opens via extension icon/keyboard shortcut.

**Tech**: Manifest V3 | React 19, TypeScript, Vite | Firebase RTDB, Google OAuth | Tailwind v3

**Entry Points**:

- UI: `src/App.tsx` → `src/features/dashboard/Dashboard.tsx`
- Background: `src/background/index.ts`

**Data Model**:

- `Group`: id, title, items[], pinned, collapsed, order, color?, createdAt, updatedAt
- `TabItem`: id, url, title, favIconUrl?

**Storage**: `chrome.storage.local` (offline-first) + Firebase sync (3-way merge)

## Key Operations

1. **Archive**: Icon click or `⌥S` → save to local + open dashboard
2. **Restore**: Click group → open tabs in new window
3. **Sync**: Auto (UI init + 5s poll) → 3-way merge → Firebase

## Commands

- `pnpm run dev` - Development server (HMR)
- `pnpm run build` - Production build
- `pnpm run check` - Type check + test + lint (CI)
- `pnpm test` - Run tests (watch mode)

## Constraints

- Firebase auth disabled in background (Service Worker: `import.meta.env.*` is `undefined`)
- Tailwind v3 only (v4 has PostCSS/shadcn issues)
- Use `chrome.storage.local` (not `.sync`; dev mode → `localStorage`)
- Dashboard opens via icon/shortcuts (not `chrome_url_overrides`)
