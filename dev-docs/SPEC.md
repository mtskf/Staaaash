# Specifications (SPEC)

## Product Vision
A modern, minimalist Chrome tab manager that declutters and saves memory by grouping tabs.

## Core Features
### 1. Tab Management
- **Save Tabs**: Archive all open tabs (excluding extension pages) into a new group.
- **Restore Tabs**:
    - **Group Restore**: Open all tabs in a new window via the "Restore" button.
    - **Individual Restore**: Open single tabs in the active window via the external link icon.
- **Original Tabs**: Close original tabs after archiving.
- **Remove Tabs**: Delete individual tabs from a group.

### 2. Group Management
- **Grouping**: Organize tabs into named collections.
- **Renaming**: Edit titles (auto-focus on creation, Enter to confirm, Esc to cancel).
- **Reordering**: Drag and drop groups to change their order.
- **Sorting**: New groups are added to the top.
- **Collapsing**: Collapse/expand groups to save space.
- **Pinning**: Pin important groups to the separate "Pinned" section at the top.
- **Merging**: Shift+Drag a group onto another to merge them (duplicates auto-removed).
- **Search**: Filter groups and tabs by title or URL.
- **Delete Group**: Remove a group from the list (with confirmation).

### 3. Data Management
- **Export**: Export all groups to a JSON file.
- **Import**: Import groups from a JSON file (merges with existing).
- **Sync**: Sync groups and tabs across devices using `chrome.storage.local` and Firebase Realtime Database (REST API).

### 4. UI/UX
- **Access**: Open via extension icon or `index.html`.
- **Context Menu**: Right-click extension icon to "Open Collections" without archiving.
- **Dark Mode**: Default dark theme.
- **Drag and Drop**: Intuitive drag-and-drop for tabs and groups.
- **Empty State**: Visual guidance and shortcuts when no groups exist.
- **Confirmation**: Dialogs for destructive actions (e.g., deleting a group).
- **Feedback**: Toast notifications for operations and errors (e.g., storage quota).


### 5. Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌥` `S` | Archive all tabs (global) |
| `⌥` `⇧` `S` | Open collection (global) |
| `⌘` `F` | Focus Search |
| `↵` | Rename selected group |
| `⌘` `↵` | Restore selected item |
| `⌫` | Delete selected item |
| `P` | Pin/Unpin group |
| `Esc` | Cancel editing |
| `↑` `↓` | Navigate items |
| `←` `→` | Collapse / Expand group |

## Non-Functional Requirements
- **Performance**: Instant load.
- **Privacy**: No external data tracking; all data stays in Chrome Storage / Firebase (User's own project).
- **Storage Limits**: Handle `chrome.storage.local` quotas gracefully.
