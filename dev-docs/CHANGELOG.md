# Changelog

## [Unreleased]

### Added
- **Sync Status Indicator**: Display Firebase sync state (syncing/synced/error) with icon next to auth button in header ([PR #61](https://github.com/mtskf/Staaaash/pull/61)).
- **Pinned Items Persist**: Pinned groups and their tabs now stay in collection when restored. Unpinned items behave as before ([PR #64](https://github.com/mtskf/Staaaash/pull/64)).

### Fixed
- Fixed tab loss during group merge when Firebase sync updates state mid-drag. Now fetches fresh data from `storage.get()` before merge and aborts with toast notification if source/target group is missing ([PR #68](https://github.com/mtskf/Staaaash/pull/68)).
- Fixed deleted pinned group reappearing briefly due to race between local write and Firebase sync. Delayed Base update until after Firebase sync completes ([PR #67](https://github.com/mtskf/Staaaash/pull/67)).
- Fixed deleted group reappearing briefly due to race condition between local write and Firebase sync callback. Added write lock with pending data queue to prevent data loss from concurrent remote updates.
- Fixed group restore opening tabs in active window instead of new window. Now uses `chrome.windows.create` to open all tabs in a new window.
- Fixed `processRemoteData` not resetting hash on failure, causing retry to be skipped ([PR #61](https://github.com/mtskf/Staaaash/pull/61)).

## [0.1.1] - 2025-01-07

### Added
- **Cross-Device Sync**: Sync groups/tabs via Firebase Realtime Database.
- **Google Authentication**: Login via `chrome.identity.launchWebAuthFlow`.
- **Delete Confirmation**: Confirm dialog for group deletion (Enter confirm, Esc cancel).
- **Sync Module**: New `sync.ts` with retry logic (exponential backoff), race condition handling, and auth state change protection ([PR #36](https://github.com/mtskf/Staaaash/pull/36)).
- **Hook Tests**: Tests for `useDashboardDnD` (5 tests) and `useKeyboardNav` (6 tests) with fake timers ([PR #37](https://github.com/mtskf/Staaaash/pull/37)).
- **Live Updates**: Dashboard now responds immediately to background script changes (e.g., archiving via icon) using `chrome.storage.onChanged` ([PR #38](https://github.com/mtskf/Staaaash/pull/38)).
- **Accessibility**: Added `aria-label` to 6 icon buttons in GroupCard and TabCard for better screen reader support ([PR #38](https://github.com/mtskf/Staaaash/pull/38)).
- **i18n Support**: Added `chrome.i18n` infrastructure, `messages.json`, and replaced hardcoded UI strings with generic `t()` wrapper  ([PR #39](https://github.com/mtskf/Staaaash/pull/39)).
- **Test Coverage**: Added tests for `useAuth.ts` (8), `GroupCard.tsx` (15), `firebase.ts` (5) - total 108 tests ([PR #44](https://github.com/mtskf/Staaaash/pull/44)).
- **Visual Hierarchy**: Enhanced Empty state, Pinned groups, and Collections sections with gradients, icons, and card shadows ([PR #53](https://github.com/mtskf/Staaaash/pull/53)).
- **Undo Delete**: 5-second toast with "Undo" action after group/tab deletion ([PR #54](https://github.com/mtskf/Staaaash/pull/54)).
- **Favicon Fallback**: Globe icon shown when `favIconUrl` is missing or fails to load; retries on URL change ([PR #55](https://github.com/mtskf/Staaaash/pull/55)).
- **TabCard Tests**: Added 8 tests for favicon fallback behavior ([PR #55](https://github.com/mtskf/Staaaash/pull/55)).

### Changed
- **Keyboard Shortcuts**: Changed archive shortcut to `⌥S`, added `⌥⇧S` to open collection. Uses `_execute_action` for archive.
- **i18n Completion**: Migrated remaining hardcoded strings in `AuthButton.tsx` and `formatRelativeTime` to `messages.json` ([PR #56](https://github.com/mtskf/Staaaash/pull/56)).
- **Sync Architecture**: Switched from Firebase SDK to REST API for MV3 CSP compliance.
- **Sync Logic**: 3-way merge to handle offline deletions and avoid "zombie" groups.
- **Data Fetching**: Fallback for empty arrays when loading from Firebase.
- **Renamed**: `mergeGroups` → `mergeGroupsIntoTarget` for clarity ([PR #34](https://github.com/mtskf/Staaaash/pull/34)).
- **Refactored**: `useKeyboardNav` now uses `reorderGroup` from `logic.ts`; pinned-first invariant guaranteed ([PR #35](https://github.com/mtskf/Staaaash/pull/35)).
- **Refactored**: `initFirebaseSync` now uses ref-counting pattern, allowing multiple subscribers with cleanup only when last subscriber unsubscribes ([PR #42](https://github.com/mtskf/Staaaash/pull/42)).

### Fixed
- Fixed crash when a group became empty (Firebase data structure mismatch).
- Fixed race condition where local changes could be overwritten by initial sync.
- Fixed issue where `Enter` key on Cancel button would trigger deletion in dialog.
- Fixed local changes being overwritten by "Remote Wins" during sync. Implemented Last Write Wins (LWW) conflict resolution using `updatedAt` timestamps ([PR #27](https://github.com/mtskf/Staaaash/pull/27)).
- Fixed `storage.set` failing when Firebase is offline. Made Firebase sync fire-and-forget to ensure local saves always succeed ([PR #29](https://github.com/mtskf/Staaaash/pull/29)).
- Fixed unnecessary storage writes on every Firebase poll. Added hash-based change detection to skip processing when remote data is unchanged ([PR #30](https://github.com/mtskf/Staaaash/pull/30)).
- Fixed keyboard reorder not persisting `order` field; added order normalization to `reorderGroup` ([PR #35](https://github.com/mtskf/Staaaash/pull/35)).
- Fixed stale sync results leaking after sign-out/account switch by invalidating in-flight requests on auth change ([PR #37](https://github.com/mtskf/Staaaash/pull/37)).
- Fixed `GroupCard` title potentially desyncing from external updates (e.g., Sync) while not editing ([PR #38](https://github.com/mtskf/Staaaash/pull/38)).
- Fixed `updateGroupData` failure leaving local state inconsistent by adding auto-reload/rollback ([PR #38](https://github.com/mtskf/Staaaash/pull/38)).
- Removed unreachable dead code in `useKeyboardNav` Enter key handler ([PR #38](https://github.com/mtskf/Staaaash/pull/38)).
- Fixed `EXTENSION_PREFIX` in `constants.ts` throwing `ReferenceError` in test environments where `chrome.runtime` is unavailable ([PR #41](https://github.com/mtskf/Staaaash/pull/41)).
- Fixed ESLint errors: Fast Refresh violations in shadcn/ui components, empty interfaces, setState in useEffect, and unused variables ([PR #45](https://github.com/mtskf/Staaaash/pull/45)).
- Fixed memory leak in `GroupCard` by adding cleanup for `setTimeout` in useEffects ([PR #46](https://github.com/mtskf/Staaaash/pull/46)).
- Replaced `any` types in test files with proper TypeScript types (`GlobalWithChrome`, `ChromeStorageLocal`, `User`) ([PR #47](https://github.com/mtskf/Staaaash/pull/47)).
- Fixed time messages using plural form for count of 1 (e.g., "1 mins ago" → "1 min ago") ([PR #57](https://github.com/mtskf/Staaaash/pull/57)).
