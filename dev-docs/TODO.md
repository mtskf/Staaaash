# TODO

> [!IMPORTANT]
> **Always keep this list sorted by Priority (High > Medium > Low).**

**Legend**:
- **Priority**: 🚨 High | ⚠️ Medium | 💡 Low | 🤖 Agent
- **Type**: ✨ Feature | 🔧 Refactor | 🐛 Bug | ⚡ Performance | 📦 Infra | 📚 Docs | ✅ Check | ❓ Quest
- **Scope**: [S] 1-2 files | [M] 3-5 files | [L] 6+ files | [I] Idea/Research

---

## Active

### 🎨 UI/UX 改善

- [ ] ⚠️✨[M] **Visual Hierarchy & Empty State 統合** (`Dashboard.tsx`, `index.css`, `public/assets/`)
  - Pinned/Collections セクションに背景色・グラデーションで視覚階層を強化
  - Empty State にイラスト/アイコン + 次アクション誘導メッセージ
  - カードデザインをリッチ化 (影、ボーダー、アイコン)
  - 前提: アイコンアセット追加 (`public/assets/`)

- [ ] ♿️🔧[S] **A11y 向上** - ユーザビリティ基盤
  - リスト構造 (`ul/li`) の適用
  - ドラッグ操作時の `aria-live` 通知
  - フォーカス管理の堅牢化

### 🧩 アーキテクチャ (将来検討)

- [ ] 💡✨[I] Atomic Design 整理: `src/features/dashboard` 肥大化時に `src/components/domain` へ分割検討

### 🤖 AI Agentic Workflow 改善 (現状スコア: 5.5/10 → 目標: 7.5/10)

**Phase 1: Critical (~2h)** - 即効性高
- [ ] 🤖🔧[S] `.agent/rules.md` 強化 (~30min)
  - 禁止コマンド: `git reset --hard`, `rm -rf`, `git push --force`
  - 確認必須: 破壊的 git 操作、大規模リファクタ、外部 API 呼び出し
  - コミットレビューフロー: 差分取得 → 静的チェック → テスト → 出力フォーマット
- [ ] 🤖📚[S] `dev-docs/DEV_GUIDE.md` 作成 (~1-2h)
  - 必読順: SPEC → ARCHITECTURE → DECISIONS → 該当モジュール
  - 優先度基準: P0 (auth/sync) → P1 (hooks) → P2 (UI) → P3 (utils)
  - タスク別エントリーポイント (どこを見れば良いか)
  - テスト実行ポリシー、作業ログテンプレート

**Phase 2: Important (~1h)** - 自動化
- [ ] 🤖📦[S] Pre-commit hook 導入 (~20min)
  - `.husky/pre-commit` で `pnpm lint && pnpm test` 自動実行
  - console.log, デバッグコード混入防止
- [ ] 🤖✨[M] `.agent/workflows/` 拡充
  - `add-feature.md`: SPEC確認 → テスト先行 → 実装 → dev-docs更新
  - `fix-bug.md`: 再現 → 失敗テスト → 最小修正 → 回帰テスト

**Phase 3: Nice-to-have**
- [ ] 🤖📦[M] GitHub Actions CI (`ci.yml`): PR/push で lint/test/build 自動実行
- [ ] 🤖✅[S] 起動チェックリスト: 環境確認 (sandbox, network, Chrome API) を定型化
- [ ] 🤖📚[S] ARCHITECTURE にモジュール依存グラフ追加

---

## ✅ Done

- [x] 💡🔧[M] テストの `any` 型を適切な型に置換。`GlobalWithChrome`, `ChromeStorageLocal`, `User` 型を追加。 [PR #47](https://github.com/mtskf/Staaaash/pull/47)
- [x] 💡🐛[S] GroupCard.tsx setTimeout にcleanup関数を追加。メモリリークを防止。
- [x] 🚨🔧[S] ESLint修正: Fast Refresh違反、空interface、useEffect内setState、未使用変数を修正。badge/button/input/kbd/Dashboard/storage 各ファイル。
- [x] 💡🔧[M] テストカバレッジ拡充: `useAuth.ts` (8 tests), `GroupCard.tsx` (15 tests), `firebase.ts` (5 tests) を追加。合計28テスト追加で108テストに。
- [x] 💡✨ UI文言 i18n 完了: 残りのハードコード文言を `messages.json` に追加し `t()` で参照。Dashboard, DashboardHeader, GroupCard を更新。
- [x] ⚠️🔧 `initFirebaseSync` ref-counting テスト追加: 複数サブスクライバの追加/削除で start/stop が正しく呼ばれることを検証。 [PR #42](https://github.com/mtskf/Staaaash/pull/42)
- [x] 💡🔧 `initFirebaseSync`: ref-counting パターンを実装。複数コンシューマーがサブスクライブ可能に。最後のサブスクライバーがアンサブスクライブしたときのみクリーンアップ。 [PR #42](https://github.com/mtskf/Staaaash/pull/42)
- [x] 💡🐛 `constants.ts`: `chrome.runtime` 参照にガードを追加し、テスト環境での例外を防止。テストも追加。 [PR #41](https://github.com/mtskf/Staaaash/pull/41)
- [x] 💡✨ i18n対応基盤: `chrome.i18n` ラッパー作成、`messages.json` 導入、コンポーネントのハードコードテキスト置換。 [PR #39](https://github.com/mtskf/Staaaash/pull/39)
- [x] ⚠️❓ migration.ts調査: `migrateToFirebase` は存在せず (`migrateAddUpdatedAt` が使用中)。対応不要。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] ⚠️✨ useGroups: `chrome.storage.onChanged` でライブ更新を追加。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] ⚠️🔧 GroupCard: `newTitle` を外部更新と同期。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] 💡🐛 useGroups: `updateGroupData` 失敗時にストレージからリロードして整合性を復元。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] 💡✨ GroupCard/TabCard: 6つのアイコンボタンに `aria-label` を追加。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] 💡🔧 useKeyboardNav: 到達不能な Enter 分岐 (6行) を削除。 [PR #38](https://github.com/mtskf/Staaaash/pull/38)
- [x] 🚨🔧 Hooksテスト追加: `useDashboardDnD.test.ts` (5 tests), `useKeyboardNav.test.ts` (6 tests) を追加。fake timers でテスト高速化。 ✅ [PR #37](https://github.com/mtskf/Staaaash/pull/37)
- [x] 🚨🔧 Sync分割: `sync.ts` モジュールを追加。retry with exponential backoff, race condition handling (syncId), auth state change protection。 ✅ [PR #36](https://github.com/mtskf/Staaaash/pull/36)
- [x] 🚨🔧 GroupOps集約: `reorderGroup` を `logic.ts` に追加し、`useKeyboardNav` をリファクタリング。pinned-first invariant を `useGroups` で保証。 ✅ [PR #35](https://github.com/mtskf/Staaaash/pull/35)
- [x] 🚨🔧 mergeGroups命名: `mergeGroups` → `mergeGroupsIntoTarget` にリネーム。 ✅ [PR #34](https://github.com/mtskf/Staaaash/pull/34)
- [x] 🚨🔧 logic.ts整理: `mergeGroups`, `moveTabToGroup`, `reorderTabInGroup` を純粋関数として `logic.ts` に抽出し、`useDashboardDnD` からDRY化。テストも追加。 ✅
- [x] 🚨🐛 `archiveTabs` が `await` 中に再実行されるとタブ保存と削除が競合し、データ重複やエラーが起きる。処理中の重複実行をロックする。 ✅
- [x] 🚨🐛 `initFirebaseSync` の購読解除がなく、アンマウント後もポーリングが残る。クリーンアップ用の unsubscribe を `useGroups` から返して破棄する。 ✅
- [x] 🚨🐛 既存グループのローカル変更が「Remote Wins」で上書きされる。LWW実装。 ✅ [PR #27](https://github.com/mtskf/Staaaash/pull/27)
- [x] 🚨🐛 `storage.set` が Firebase 失敗時に例外。Fire-and-forget化。 ✅ [PR #29](https://github.com/mtskf/Staaaash/pull/29)
- [x] 🚨🐛 ポーリングが未変更でも書き戻し。ハッシュ検出でスキップ。 ✅ [PR #30](https://github.com/mtskf/Staaaash/pull/30)
- [x] 🚨🔧 Storage統合: `background/storage.ts` が `lib/storage.ts` と重複している。background から lib/storage を直接使用し、重複ファイルを削除する。 ✅
- [x] ⚠️🔧 キーボード並び替えで `order` が更新されず、再読み込みで並びが戻る可能性。`reorderGroup` に order 正規化を追加して修正。 ✅
