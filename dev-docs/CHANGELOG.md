# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Initial project setup with Vite, React, TypeScript.
- Core dashboard UI with Drag & Drop.
- Chrome Storage Sync integration.
- Group and Tab management components.
- Documentation structure (`dev-docs`).

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
