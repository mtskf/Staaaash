# Architecture

**Purpose**: Implementation guide for developers (algorithms, data flow, invariants)

Staaaash is a Chrome Extension dashboard for saving, organizing, and restoring tab groups.

## Core Components

### 1. Dashboard UI (`src/features/dashboard`)

- **Framework**: React + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **State Management**: React local state (`useState` / `useEffect`)
- **Drag & Drop**: `@dnd-kit` for group/tab reordering

### 2. Data Persistence (`src/lib/storage.ts`, `src/lib/firebase.ts`)

**Storage Architecture**:

- **Offline-First**: `chrome.storage.local` is the source of truth for UI
- **Cloud Sync**: Firebase Realtime Database via REST API
- **Conflict Resolution**: 3-way merge (Local, Remote, Base) with LWW for per-group conflicts

**Authentication**:

- `chrome.identity.launchWebAuthFlow` to obtain Google OAuth access token
- Access token → Firebase Auth via `signInWithCredential()`
- REST API calls use `user.getIdToken()` for authentication

**Schema**:

- `groups`: Array of `Group` objects
- `Group`: `id`, `title`, `items` (TabItem[]), `pinned`, `collapsed`, `order`, `color?`, `createdAt`, `updatedAt`
- `TabItem`: `id`, `url`, `title`, `favIconUrl?`

**Sync Strategy**:

- **3-Way Merge**: Compares Local, Remote, and Base (last synced state stored in `staaaash_last_synced`)
- **Stale Protection**: Detects rolled-back local data by comparing overlapping group timestamps with Base
- **Triggers**: UI initialization (via `initFirebaseSync`) + 5-second polling (via `subscribeToGroups`)
- **Fire-and-Forget**: Firebase sync runs in background; local saves never block UI
- **Change Detection**: Hash remote data to skip no-op syncs
- **Write Lock**: `localWriteInProgress` flag prevents Firebase callback from overwriting local changes
- **Pending Queue**: Remote updates during local write are queued in `pendingRemoteData`
- **Error Handling**: Local operations always succeed; Firebase failures don't block user actions

#### Key Modules

- `storage.ts` - Chrome storage operations + Firebase sync orchestration
- `sync.ts` - Firebase synchronization with retry logic, exponential backoff, and stale result detection
- `sync-utils.ts` - 3-way merge logic (pure functions)
- `logic.ts` - Group/tab operations (pure functions)
- `useGroups.ts` - State management hook (React)
- `background/index.ts` - Service worker (archiving, shortcuts)

#### Invariants

- Groups sorted by `pinned` (true first), then by `order` (ascending)
- `updatedAt` updated on ANY content change (including `order`, `pinned`, `collapsed`)
- `updatedAt` comparison uses deep equality (excludes only `updatedAt` itself)
- Background scripts cannot access Firebase auth (`import.meta.env.*` is `undefined` in Service Worker)

### 3. Background Scripts (`src/background`)

- **Archiving**: Extension icon click or `⌥S` to save current window tabs
- **Open Dashboard**: `⌥⇧S` to open collection dashboard
- **Context Menu**: "Open Collections" menu item
- **Keyboard Shortcuts**: Global shortcuts via `chrome.commands`
- **Bundling**: `esbuild` for Service Worker module handling

## Directory Structure

- `src/features/dashboard/` - UI components & business logic
- `src/lib/` - Core utilities (storage, sync, Firebase, migrations)
- `src/background/` - Extension service worker
- `src/hooks/` - React state management & custom hooks
- `src/components/ui/` - Generic UI components (shadcn/ui, sonner)
- `src/types/` - TypeScript type definitions
- `src/test/` - Test setup & utilities

## Build System

- **Vite**: HMR during development, optimized bundling for production
- **Manifest V3**: Chrome Extension standards compliance
- **TypeScript**: Strict type checking
- **esbuild**: Service Worker bundling (background scripts)
