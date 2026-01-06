# Changelog

## [Unreleased] (Target: 0.2.0)

### Added
- **Cross-Device Sync**: Sync groups/tabs via Firebase Realtime Database.
- **Google Authentication**: Login via `chrome.identity.launchWebAuthFlow`.
- **Delete Confirmation**: Confirm dialog for group deletion (Enter confirm, Esc cancel).
- **Sync Module**: New `sync.ts` with retry logic (exponential backoff), race condition handling, and auth state change protection ([PR #36](https://github.com/mtskf/Staaaash/pull/36)).
- **Hook Tests**: Tests for `useDashboardDnD` (5 tests) and `useKeyboardNav` (6 tests) with fake timers ([PR #37](https://github.com/mtskf/Staaaash/pull/37)).

### Changed
- **Sync Architecture**: Switched from Firebase SDK to REST API for MV3 CSP compliance.
- **Sync Logic**: 3-way merge to handle offline deletions and avoid "zombie" groups.
- **Data Fetching**: Fallback for empty arrays when loading from Firebase.
- **Renamed**: `mergeGroups` → `mergeGroupsIntoTarget` for clarity ([PR #34](https://github.com/mtskf/Staaaash/pull/34)).
- **Refactored**: `useKeyboardNav` now uses `reorderGroup` from `logic.ts`; pinned-first invariant guaranteed ([PR #35](https://github.com/mtskf/Staaaash/pull/35)).

### Fixed
- Fixed crash when a group became empty (Firebase data structure mismatch).
- Fixed race condition where local changes could be overwritten by initial sync.
- Fixed issue where `Enter` key on Cancel button would trigger deletion in dialog.
- Fixed local changes being overwritten by "Remote Wins" during sync. Implemented Last Write Wins (LWW) conflict resolution using `updatedAt` timestamps ([PR #27](https://github.com/mtskf/Staaaash/pull/27)).
- Fixed `storage.set` failing when Firebase is offline. Made Firebase sync fire-and-forget to ensure local saves always succeed ([PR #29](https://github.com/mtskf/Staaaash/pull/29)).
- Fixed unnecessary storage writes on every Firebase poll. Added hash-based change detection to skip processing when remote data is unchanged ([PR #30](https://github.com/mtskf/Staaaash/pull/30)).
- Fixed keyboard reorder not persisting `order` field; added order normalization to `reorderGroup` ([PR #35](https://github.com/mtskf/Staaaash/pull/35)).
- Fixed stale sync results leaking after sign-out/account switch by invalidating in-flight requests on auth change ([PR #37](https://github.com/mtskf/Staaaash/pull/37)).
