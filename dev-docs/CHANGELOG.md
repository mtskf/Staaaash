# Changelog

## [0.2.0] - Firebase Sync & Reliability

### Added
- **Cross-Device Sync**: Real-time synchronization of groups and tabs across devices using Firebase Realtime Database.
- **Google Authentication**: Seamless login using your Google account via `chrome.identity.launchWebAuthFlow`.
- **Delete Confirmation**: Safe deletion with confirmation dialog for groups (Keyboard support: Enter to confirm, Esc to cancel).

### Changed
- **Sync Architecture**: Switched from Firebase SDK to REST API to comply with Manifest V3 CSP restrictions.
- **Sync Logic**: Implemented robust 3-way merge logic to correctly handle offline deletions and prevent "zombie group" resurrection.
- **Data Fetching**: Added fallback for empty arrays to prevent crashes when fetching data from Firebase.

### Fixed
- Fixed crash when a group became empty (Firebase data structure mismatch).
- Fixed race condition where local changes could be overwritten by initial sync.
- Fixed issue where `Enter` key on Cancel button would trigger deletion in dialog.
