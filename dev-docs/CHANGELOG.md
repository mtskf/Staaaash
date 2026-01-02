# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.6.0] - 2026-01-02
### Added
- **Cloud Sync**: Sign in with Google to sync data across all devices via Firebase Realtime Database.
- **Offline First**: Works without internet, syncs when connected.
- **Auth Button**: Sign in/out button in the header.

### Changed
- **Storage**: Migrated from `chrome.storage.sync` to `chrome.storage.local` + Firebase for unlimited storage.
- **OAuth**: Uses `launchWebAuthFlow` for authentication (works with any extension ID).

## [0.5.0] - 2025-12-26
### Added
- **Search**: Filter groups and tabs by title or URL.
- **Data Management**: Export to JSON and Import functionality.
- **Empty State**: Friendly illustration and guidance when no groups exist.
- **Feedback**: Toast notifications for operations and storage errors (using `sonner`).
- **Confirmation**: Dialog for deleting groups.
- **Selection Logic**: Smart list selection when deleting/restoring items.
- **Logo**: Replaced text header with Staaaash logo.

### Changed
- **Shortcut**: Updated Archive Tabs shortcut to `⌘+Shift+.` (Mac) / `Ctrl+Shift+.` (Windows).
- **UI Clean-up**: Removed button tooltips for a cleaner interface.
- **Performance**: Prevent duplicate "Collections" tabs from opening.

## [0.4.0] - 2025-12-26
### Added
- **Tooltips with Shortcuts**: Hover over action buttons to see button names and keyboard shortcuts (using `<kbd>` styling).
- **Archive Keyboard Shortcut**: `⌘+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows) to archive all tabs in current window.
- **Extension Icon**: Custom minimalist icon for the extension.
- **MIT License**: Added LICENSE file.

### Changed
- **README**: Reformatted with centered header, tables, and `<kbd>` styled shortcuts.
- **Code Cleanup**: Removed unused files (`App.css`, `useTabs.ts`, `react.svg`).

## [0.3.0] - 2025-12-26
### Added
- **Group Merging**: Shift+Drag a group onto another to merge them (tabs combined, duplicates removed).
- **Duplicate Tab Removal**: Tabs with the same URL are automatically deduplicated when archiving or merging.
- **Keyboard Shortcuts**:
    - `Enter`: Rename selected group.
    - `Cmd/Ctrl + Enter`: Restore selected item.
    - `Escape`: Cancel group name editing.
    - Arrow keys for navigation.
- **Edit Icon**: Pencil icon next to group title for easier rename access.
- **Tab Action Buttons**: Restore/Delete buttons visible when tab is selected via keyboard.

### Changed
- **Group Title Font**: Set to `0.875rem` (`text-sm`) for consistency.
- **Title Input Width**: Expanded to fill available space.
- **Button Colors**:
    - Delete button: Brighter red (`text-red-500`).
    - Pin icon: Yellow when active (`text-yellow-500`).
- **Drag Cursor**: Shows `copy` cursor during merge mode, `grabbing` during normal drag.
- **Tab Focus**: Disabled Tab key focus on drag handles.

## [0.2.0] - 2025-12-26
### Added
- **UI Refinement**: Vertical Stack Layout for Dashboard.
- **Auto-focus**: New groups automatically enter edit mode with the name selected.
- **Restore Functionality**:
    - "Restore" button on Group cards (opens all tabs in group).
    - "Restore" (Open External) button on individual tabs (opens tab in background).
- **Context Menu**: "Open Collections" context menu item.
- **Badges**: Integrated tab count into the Restore button on Group cards.

### Changed
- **Sorting**: Newly created groups now appear at the top of the Collections list.
- **Build System**: Switched background script bundling to `esbuild` for stability.
- **Drag & Drop**:
    - Fixed dragging visual bugs (groups stretching vertically).
    - Fixed tab items not following cursor (overlay logic fix).
    - Fixed touch propagation issues on buttons.
