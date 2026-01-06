# TODO

**Legend**:
- **Priority**: 🚨 High | ⚠️ Medium | 💡 Low
- **Type**: ✨ Feature | 🔧 Refactor | 🐛 Bug | ⚡ Performance | 📦 Infra
- **Scope**: [S] 1-2 files | [M] 3-5 files | [L] 6+ files

---

## Active
- [ ] 💡🔧[S] `Enter` キー処理に到達不能な分岐があるため整理する。 (`src/hooks/useKeyboardNav.ts`) → PR #38 で対応済み、マージ待ち
- [ ] 💡✨[M] UIのテキスト(Archive, Delete等)がハードコードされている。i18n対応の準備として定数化または `chrome.i18n` 化を検討する。 (`src/constants.ts`, components)
- [ ] 💡🐛[S] `constants.ts` がモジュール読み込み時に `chrome.runtime` を参照し、テスト環境で例外になる可能性がある。遅延評価かガードを入れる。 (`src/constants.ts`)
- [ ] 💡🔧[S] `initFirebaseSync` がシングルトンで、複数コンシューマーがマウントすると最初のunmountで全体のsyncが停止する。現在は `useGroups` のみが使用するため問題ないが、将来の拡張に備えてContext providerかref-countingパターンへのリファクタを検討する。 (`src/lib/storage.ts`)

---

## ✅ Done

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
