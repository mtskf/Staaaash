# Specifications (SPEC)

**Purpose**: Feature requirements for product/QA (user behavior, acceptance criteria)

## Product Vision

Organize and restore browser tabs via persistent, cloud-synced groups.

## Core Features

### 1. Tab Management

- **Save Tabs**: Archive all open tabs (excluding extension pages) into a new group
- **Restore Tabs**:
  - **Group Restore**: Open all tabs in a new window via the "Restore" button
  - **Individual Restore**: Open single tabs in the active window via the external link icon
- **Original Tabs**: Close original tabs after archiving
- **Remove Tabs**: Delete individual tabs from a group

### 2. Group Management

- **Grouping**: Organize tabs into named collections
- **Renaming**: Edit titles (auto-focus on creation, Enter to confirm, Esc to cancel)
- **Reordering**: Drag and drop groups to change their order
- **Sorting**: New groups are added to the top
- **Collapsing**: Collapse/expand groups to save space
- **Pinning**: Pin important groups to separate "Pinned" section at top (pinned items stay in collection when restored)
- **Merging**: Shift+Drag a group onto another to merge (duplicates detected by URL and auto-removed)
- **Search**: Filter groups and tabs by title or URL
- **Delete Group**: Remove a group (with confirmation dialog)

### 3. Data Management

- **Export**: Export all groups to JSON file
- **Import**: Import groups from JSON file (merges with existing data)
- **Authentication**: Sign in with Google to enable cloud sync
- **Sync**: Sync groups across devices via cloud backup (requires authentication)
- **Offline Mode**: Full functionality without authentication (local storage only)

### 4. UI/UX

- **Extension Icon Click**: Archive current tabs and open dashboard (default action)
- **Keyboard Shortcuts**:
  - `⌥S`: Archive and open dashboard (same as icon click)
  - `⌥⇧S`: Open dashboard without archiving
- **Context Menu**: Right-click extension icon → "Open Collections" (no archiving)
- **Dark Mode**: Default dark theme
- **Drag and Drop**: Intuitive reordering for tabs and groups
- **Empty State**: Visual guidance and keyboard shortcuts when no groups exist
- **Confirmation**: Dialogs for destructive actions (delete group, etc.)
- **Feedback**: Toast notifications for operations and errors (storage quota, sync errors)
- **Sync Indicator**: Visual feedback for sync status (syncing/success/error)

### 5. Keyboard Shortcuts

| Shortcut (Mac) | Shortcut (Win/Linux) | Action                    |
|----------------|----------------------|---------------------------|
| `⌥S`           | `Alt+S`              | Archive all tabs (global) |
| `⌥⇧S`          | `Alt+Shift+S`        | Open collection (global)  |
| `⌘F`           | `Ctrl+F`             | Focus search              |
| `↵`            | `Enter`              | Rename selected group     |
| `⌘↵`           | `Ctrl+Enter`         | Restore selected item     |
| `⌫`            | `Delete`             | Delete selected item      |
| `P`            | `P`                  | Pin/Unpin group           |
| `Esc`          | `Esc`                | Cancel editing            |
| `↑` `↓`        | `↑` `↓`              | Navigate items            |
| `←` `→`        | `←` `→`              | Collapse/Expand group     |

## Non-Functional Requirements

- **Privacy**: All data stored locally or in user's Firebase project (no third-party tracking)
- **Storage**: Handle `chrome.storage.local` quota limits gracefully (show warnings, prevent data loss)
- **Performance**: UI remains responsive with 100+ groups
