# CLAUDE.md

このリポジトリで作業する際のガイド。

## コマンド

```bash
pnpm run dev       # 開発サーバー (HMR)
pnpm run build     # 本番ビルド
pnpm run check     # typecheck + test + lint (CI用)
pnpm test          # テスト (ウォッチモード)
```

## アーキテクチャ

Chrome Extension (Manifest V3) + React + Firebase クラウド同期

### 同期戦略

- **Offline-First**: `chrome.storage.local` が正。UIはネットワーク待ちしない
- **3-Way Merge**: Local / Remote / Base で作成・削除を判定
- **LWW**: 競合は `updatedAt` で解決（新しい方が勝つ）
- **Fire-and-Forget**: Firebase同期はバックグラウンド実行

### 主要モジュール

- `storage.ts` - Chrome storage + Firebase同期
- `sync-utils.ts` - 3-wayマージ（純粋関数）
- `logic.ts` - グループ/タブ操作（純粋関数）
- `useGroups.ts` - 状態管理フック
- `background/index.ts` - アーカイブ用SW

### 不変条件

- グループは pinned優先 → `order` でソート
- `updatedAt` はコンテンツ変更時のみ
- バックグラウンド: Firebase auth 無効

## プロジェクト固有

- `pnpm` 使用、パスエイリアス `@/` = `src/`
- 外部API: `try-catch` + リトライ
- ドキュメント: `dev-docs/` に配置
