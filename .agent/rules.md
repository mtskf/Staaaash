# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Dev server with HMR
pnpm run build        # Production build
pnpm run lint         # ESLint
pnpm run check        # typecheck + test + lint

pnpm test             # Vitest watch mode
pnpm test -- --run    # Run once
pnpm test <pattern>   # Run specific file
```

## Architecture

Chrome Extension (Manifest V3) with React dashboard and Firebase cloud sync.

### Sync Strategy

- **Offline-First**: `chrome.storage.local` is source of truth; UI never blocks on network
- **3-Way Merge**: Local, Remote, Base comparison for creations/deletions
- **LWW**: Conflicts resolved by `updatedAt` (newer wins)
- **Fire-and-Forget**: Firebase sync in background; errors don't fail local saves

### Key Modules

- `storage.ts` - Chrome storage + Firebase sync orchestration
- `sync-utils.ts` - Pure 3-way merge algorithm
- `logic.ts` - Pure group/tab operations (merge, reorder, move)
- `useGroups.ts` - Main state hook with optimistic updates
- `background/index.ts` - Service worker for archiving

### Invariants

- Groups sorted **pinned-first**, then by `order`
- `updatedAt` set on content changes only
- Background script: Firebase auth disabled via esbuild

## Tips

- Use `pnpm` (not npm/yarn)
- Path alias: `@/` = `src/`

## Project Rules

- グローバルで指定されたルールに従って
- タスク完了時は `dev-docs/` を必要に応じて更新
- TypeScript + ES Modules
- 外部API呼び出しは `try-catch` + リトライ処理
- コミットIDが渡された場合は、そのコミットを徹底的にレビュー
