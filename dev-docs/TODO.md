# TODO

**Legend**:
- **Priority**: 🚨 High | ⚠️ Medium | 💡 Low
- **Type**: ✨ Feature | 🔧 Refactor | 🐛 Bug | ⚡ Performance | 📦 Infra
- **Scope**: [S] 1-2 files | [M] 3-5 files | [L] 6+ files

---

## Active
- [ ] 🚨🔧[M] GroupOps集約: `useKeyboardNav.ts` が独自のロジックで移動・並び替えを実装しており `logic.ts` を使用していない。`useDashboardDnD` と `useKeyboardNav` の操作ロジックを `logic.ts` の純粋関数に委譲して重複を解消する。（共通フック化は過度な抽象化と判断し行わない） (`src/hooks/useDashboardDnD.ts`, `src/hooks/useKeyboardNav.ts`)
- [ ] 🚨🔧[M] Sync分割: `storage.ts` がローカル・Firebase・同期・マージ・移行の全責務を持っGod Object化している。`SyncManager` クラス等に同期ロジックを分離し、`storage.ts` はインターフェース定義と単純な保存のみに留める。 (`src/lib/storage.ts`)
- [ ] 🚨✅[M] Hooksテスト追加: `useGroups`, `useDashboardDnD`, `useKeyboardNav` のテストが存在しない（`Dashboard.test.tsx` は初期表示のみを確認）。複雑な状態遷移を持つため、これらのカスタムフックに対するユニットテスト/統合テストを追加する。
- [ ] 🚨🔧[S] mergeGroups命名: 関数が `sync-utils.ts` (`mergeGroupsThreeWay`) と `logic.ts` (`mergeGroups`) で名前が似ているが動作が異なる（3-way merge vs 2-group merge）。`mergeGroupsIntoTarget` 等にリネームして区別する。 (`src/lib/sync-utils.ts`, `src/lib/logic.ts`)
- [ ] ⚠️❓[S] `src/lib/migration.ts` の `migrateToFirebase` が未使用。完了しているなら削除、必要なら認証フローに組み込む。 (`src/lib/migration.ts`)
- [ ] ⚠️🔧[S] キーボード並び替えで `order` が更新されず、再読み込みで並びが戻る可能性。並べ替え時に `order` を正規化して保存するロジックを確認/修正。 (`src/hooks/useKeyboardNav.ts`)
- [ ] ⚠️✨[S] 背景スクリプトで追加されたグループが、開いているダッシュボードに即時反映されない。`chrome.storage.onChanged` でローカル更新を監視する。 (`src/hooks/useGroups.ts`)
- [ ] ⚠️🔧[S] `GroupCard` の `newTitle` が外部更新と同期されず、同期更新後の編集で古いタイトルが出る。`group.title` 変更時に state を更新する。 (`src/features/dashboard/GroupCard.tsx`)
- [ ] 💡🔧[S] `Enter` キー処理に到達不能な分岐があるため整理する。 (`src/hooks/useKeyboardNav.ts`)
- [ ] 💡🐛[S] `updateGroupData` の失敗時に状態がローカルと不整合のままになる。失敗時のリロード/ロールバックを追加する。 (`src/hooks/useGroups.ts`)
- [ ] 💡✨[S] `GroupCard` や `TabCard` のアイコンボタンに `aria-label` がなく、アクセシビリティが不十分。適切なラベルを付与する。 (`src/features/dashboard/GroupCard.tsx`, `src/features/dashboard/TabCard.tsx`)
- [ ] 💡✨[M] UIのテキスト(Archive, Delete等)がハードコードされている。i18n対応の準備として定数化または `chrome.i18n` 化を検討する。 (`src/constants.ts`, components)
- [ ] 💡🐛[S] `constants.ts` がモジュール読み込み時に `chrome.runtime` を参照し、テスト環境で例外になる可能性がある。遅延評価かガードを入れる。 (`src/constants.ts`)
- [ ] 💡🔧[S] `initFirebaseSync` がシングルトンで、複数コンシューマーがマウントすると最初のunmountで全体のsyncが停止する。現在は `useGroups` のみが使用するため問題ないが、将来の拡張に備えてContext providerかref-countingパターンへのリファクタを検討する。 (`src/lib/storage.ts`)

---


## ✅ Done

- [x] 🚨🔧 logic.ts整理: `mergeGroups`, `moveTabToGroup`, `reorderTabInGroup` を純粋関数として `logic.ts` に抽出し、`useDashboardDnD` からDRY化。テストも追加。 ✅
- [x] 🚨🐛 `archiveTabs` が `await` 中に再実行されるとタブ保存と削除が競合し、データ重複やエラーが起きる。処理中の重複実行をロックする。 ✅
- [x] 🚨🐛 `initFirebaseSync` の購読解除がなく、アンマウント後もポーリングが残る。クリーンアップ用の unsubscribe を `useGroups` から返して破棄する。 ✅
- [x] 🚨🐛 既存グループのローカル変更が「Remote Wins」で上書きされる。LWW実装。 ✅ https://github.com/mtskf/Staaaash/pull/27
- [x] 🚨🐛 `storage.set` が Firebase 失敗時に例外。Fire-and-forget化。 ✅ https://github.com/mtskf/Staaaash/pull/29
- [x] 🚨🐛 ポーリングが未変更でも書き戻し。ハッシュ検出でスキップ。 ✅ https://github.com/mtskf/Staaaash/pull/30
- [x] 🚨🔧 Storage統合: `background/storage.ts` が `lib/storage.ts` と重複している。background から lib/storage を直接使用し、重複ファイルを削除する。 (`src/background/storage.ts`, `src/background/index.ts`)
