# Decisions Log

## 2026-01-02: Firebase REST API for Sync
- **Context**: Firebase JS SDK uses `eval` or similar mechanisms that violate Manifest V3 Content Security Policy (CSP).
- **Decision**: Use Firebase Realtime Database **REST API** instead of the SDK.
- **Consequences**:
    - No real-time WebSocket listeners; must use polling (implemented with `setTimeout`).
    - Authentication requires manual token management (handled via `chrome.identity`).
    - Compliant with Manifest V3.

## 2026-01-02: 3-Way Merge for Sync
- **Context**: Naive sync ("Remote missing = New Local item") caused deleted groups to resurrect on other devices.
- **Decision**: Implement **3-Way Merge** by storing a snapshot of `Last Synced State` (Base).
- **Logic**:
    - If `Local` has item, `Remote` does not:
        - If `Base` had it -> It was deleted remotely. **Action**: Delete Locally.
        - If `Base` did not have it -> It is new locally. **Action**: Push to Remote.
- **Consequences**: reliable deletion handling without complex tombstones. Cards and Buttons.

## 2024-12-25: UI Library Choice
- **Decision**: Use shadcn/ui + Tailwind CSS.
- **Rationale**: Provides high-quality, accessible components with full control over styles via Tailwind. Reduces time spent building common UI elements like Cards and Buttons.

## 2024-12-25: Drag and Drop Library
- **Decision**: Use `@dnd-kit`.
- **Rationale**: Modern, lightweight, and accessible compared to `react-beautiful-dnd`. Supports strict mode and future React versions better.

## 2024-12-26: Tailwind Version
- **Decision**: Stick with Tailwind CSS v3.
- **Rationale**: v4 introduced breaking changes interacting with the PostCSS config and shadcn/ui themes. Downgraded to v3 for stability.

## 2024-12-26: Toast Notifications
- **Decision**: Use `sonner`.
- **Rationale**: Lightweight, customizable, and visually appealing toast library that integrates well with shadcn/ui styling.

## 2024-12-26: Simplification
- **Decision**: Remove tooltips.
- **Rationale**: Prioritize clean UI over redundant helpers. Shortcuts are documented in empty state and help section.
