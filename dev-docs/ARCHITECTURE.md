# Architecture

## Overview
Staaaash is a Chrome Extension that replaces the New Tab page with a dashboard to save, organize, and restore tab groups.

## Core Components
### 1. New Tab Dashboard (`src/features/dashboard`)
- **Framework**: React + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **State Management**: React local state (`useState` / `useEffect`).
- **Drag & Drop**: `@dnd-kit` (Core, Sortable, Utilities) for complex interactions.
    - `GroupCard`: Handles group rendering and internal sortable context.
    - `TabCard` / `SortableTabCard`: Separated for correct DragOverlay behavior.
    - `Dashboard`: Orchestrates the main DndContext and state updates.

### 2. Data Persistence (`src/lib/storage.ts`, `src/lib/firebase.ts`)
- **Storage**:
    - **Offline-First**: `chrome.storage.local` is the UI source of truth.
    - **Cloud Sync**: Firebase Realtime Database via REST API.
    - **Sync Strategy**: 3-way merge (Local, Remote, Base).
- **Authentication**: `chrome.identity.launchWebAuthFlow` with Google OAuth 2.0 (Web Application Client).
- **Schema**:
  - `groups`: Array of `Group` objects.
  - `Group`: Contains `id`, `title`, `items` (tabs), `pinned`, `collapsed`, `order`, `createdAt`, `updatedAt`.
  - `TabItem`: Contains `id`, `url`, `title`, `favIconUrl`.
- **Sync Details**:
  - **LWW**: Conflicts resolved by `updatedAt` (newer wins).
  - **Fire-and-Forget**: Firebase sync runs in background; local saves never block.
  - **Change Detection**: Hash remote data to skip no-op polls.

### 3. Background Scripts (`src/background`)
- **Archiving**: Extension icon click and `⌘+Shift+S` to archive current window tabs.
- **Context Menu**: Manages the "Open Collections" context menu item.
- **Keyboard Shortcuts**: Listens for `chrome.commands` for global shortcuts.
- **Bundling**: `esbuild` for Service Worker module handling.

## Directory Structure
```
src/
├── background/      # Extension background service worker
├── components/ui/   # Generic UI components (shadcn/ui, sonner)
├── features/        # Feature-specific logic (Dashboard, etc.)
├── hooks/           # Custom React hooks (useGroups, useDashboardDnD, useKeyboardNav)
├── lib/             # Utilities (storage, sync, logic, firebase)
├── types/           # TypeScript definitions
├── App.tsx          # Main app entry
├── main.tsx         # React entry point
└── index.css        # Global styles
```

## Build System
- **Vite**: Handles HMR during dev and bundling for production.
- **Manifest V3**: Compliant with latest Chrome Extension standards.
