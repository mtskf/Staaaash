# Tech Stack

## Core
- **Language**: TypeScript
- **Framework**: React 19

### Backend / BaaS
- **Firebase Realtime Database**: For cross-device data synchronization (REST API).
- **Firebase Authentication**: Google OAuth 2.0 for user identity.

## Extension
- **Platform**: Chrome Extension Manifest V3
- **APIs**: `chrome.storage.local`, `chrome.tabs`, `chrome.identity`

- **Database**: Firebase Realtime Database
- **Auth**: Firebase Auth + Google OAuth via `launchWebAuthFlow`

## UI/UX
- **Styling**: Tailwind CSS v3
- **Components**: shadcn/ui (Radix UI primitives), @radix-ui/react-alert-dialog
- **Notifications**: sonner
- **Icons**: lucide-react
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable

## Tooling
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Formatting**: Prettier (if configured)
