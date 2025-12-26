# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
