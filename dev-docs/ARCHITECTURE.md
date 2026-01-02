# Architecture

## Overview
Staaaash is a Chrome Extension designed to manage and organize browser tabs into groups, similar to Toby. It overrides the New Tab page to provide a dashboard where users can save, reorganize, and restore tabs.

## Core Components
### 1. New Tab Dashboard (`src/features/dashboard`)
- **Framework**: React + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **State Management**: React `useState` / `useEffect` + Local Component State.
- **Drag & Drop**: `@dnd-kit` (Core, Sortable, Utilities) for complex interactions.
    - `GroupCard`: Handles group rendering and internal sortable context.
    - `TabCard` / `SortableTabCard`: Separated for correct DragOverlay behavior.
    - `Dashboard`: Orchestrates the main DndContext and state updates.

### 2. Data Persistence (`src/lib/storage.ts`, `src/lib/firebase.ts`)
- **Storage**:
    - **Offline-First**: `chrome.storage.local` is the single source of truth for the UI.
    - **Cloud Sync**: Google Firebase Realtime Database (via REST API).
    - **Sync Strategy**: 3-Way Merge (Local, Remote, Base) to handle offline changes and deletions without conflict.
- **Authentication**: `chrome.identity.launchWebAuthFlow` with Google OAuth 2.0 (Web Application Client).
- **Schema**:
  - `groups`: Array of `Group` objects.
  - `Group`: Contains `id`, `title`, `items` (tabs), `pinned`, `collapsed`, `order`, `createdAt`.
  - `TabItem`: Contains `id`, `url`, `title`, `favIconUrl`.

### 3. Background Scripts (`src/background`)
- **Archiving**: Handles the click on the extension icon and `⌘+Shift+S` shortcut to archive current window tabs.
- **Context Menu**: Manages the "Open Collections" context menu item.
- **Keyboard Shortcuts**: Listens for `chrome.commands` for global shortcuts.
- **Bundling**: Built with `esbuild` for proper module handling in the Service Worker environment.

## Directory Structure
```
src/
├── background/      # Extension background service worker
├── components/ui/   # Generic UI components (shadcn/ui, sonner)
├── features/        # Feature-specific logic (Dashboard, etc.)
├── lib/             # Utilities (storage, utils)
├── types/           # TypeScript definitions
├── App.tsx          # Main app entry
├── main.tsx         # React entry point
└── index.css        # Global styles
```

## Build System
- **Vite**: Handles HMR during dev and bundling for production.
- **Manifest V3**: Compliant with latest Chrome Extension standards.
