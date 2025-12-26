# Lessons Learned

## TypeScript & Chrome API
- **Mocking**: When developing locally (outside extension environment), Chrome APIs are undefined. Need robust mocking in hooks (e.g., `useTabs`) to allow UI development without constantly reloading the extension.
- **Types**: `@types/chrome` is essential but needs to be added to `tsconfig.app.json` explicitly in `types` array.

## Build Process
- **Tailwind v4 vs v3**: Tailwind v4 behaves differently with PostCSS. For existing ecosystems like shadcn/ui, established v3 patterns are more reliable currently.
- **Hoisting**: React components/hooks order matters. Declare helper functions before they are used in `useEffect` or wrap them in `useCallback` to satisfy linter and run-time safety.

## Storage
- **Quotas**: `chrome.storage.sync` has strict limits (8KB per item, 100KB total). Large datasets (many tabs/groups) can hit this easily. Error handling and user feedback (Toasts) are critical for robust extensions.

## UI/UX
- **Selection State**: When deleting items from a keyboard-navigable list, auto-selecting the adjacent item maintains flow and prevents "lost focus" states.
