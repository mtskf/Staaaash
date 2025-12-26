# Specifications (SPEC)

## Product Vision
A modern, minimalist tab manager extension for Chrome that helps users declutter their browser and save memory by organizing tabs into named groups.

## Core Features
### 1. Tab Management
- **Save Tabs**: Save all open tabs (excluding extension pages) in the current window to a new group.
- **Restore Tabs**:
    - **Group Restore**: Open all tabs in a group via the "Restore" button.
    - **Individual Restore**: Open single tabs via the external link icon.
    - **Original Tabs**: Original tabs are closed after saving (Archiving).
- **Remove Tabs**: Delete individual tabs from a group.

### 2. Group Management
- **Grouping**: Organize tabs into named collections.
- **Renaming**: Edit group titles (Auto-focus on creation).
- **Reordering**: Drag and drop groups to change their order.
- **Sorting**: New groups are automatically added to the top of the list.
- **Collapsing**: Collapse/Expand groups to save space.
- **Pinning**: Pin important groups to the separate "Pinned" section at the top.
- **Merging**: Merge two groups into one (Planned).

### 3. Sync
- **Cross-Device**: Sync groups and tabs across devices using `chrome.storage.sync`.

### 4. UI/UX
- **New Tab Override**: Replaces the default new tab page (Dashboard).
- **Context Menu**: Right-click extension icon to "Open Collections" without archiving.
- **Dark Mode**: Default dark theme.
- **Drag and Drop**: Intuitive drag-and-drop for tabs and groups.

## Non-Functional Requirements
- **Performance**: Instant load on new tab.
- **Privacy**: No external data tracking; all data stays in Chrome Sync.
- **Storage Limits**: Handle `chrome.storage.sync` quotas gracefully (future consideration).
