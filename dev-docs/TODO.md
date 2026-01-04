# TODO

## Active
- [x] 🚨🧹 Storage統合: `background/storage.ts` が `lib/storage.ts` と重複している。background から lib/storage を直接使用し、重複ファイルを削除する。 (`src/background/storage.ts`, `src/background/index.ts`)
- [ ] 🚨🧹 logic.ts整理: `mergeGroups`, `moveTabToGroup`, `reorderTabInGroup` がテストでのみ使用され、実際は `useDashboardDnD` でインライン実装。削除して `filterGroups` のみ残すか、DRY化する。 (`src/lib/logic.ts`, `src/hooks/useDashboardDnD.ts`)
- [ ] 🚨🧹 mergeGroups命名: 関数が2箇所に異なる用途で存在し混乱を招く。命名を明確化する（`mergeGroupsThreeWay` 等）。 (`src/lib/sync-utils.ts`, `src/lib/migration.ts`)
- [ ] 🚨🧹 GroupOps集約: DnD/Keyboardの操作ロジックを共通化し、重複実装を整理する。 (`src/hooks/useDashboardDnD.ts`, `src/hooks/useKeyboardNav.ts`)
- [ ] 🚨🧹 Sync分割: `storage.ts` が複数の責務を持ち肥大化（306行）。同期ロジックを `sync-manager.ts` に分離し、ストレージ操作のみに限定する。 (`src/lib/storage.ts`)
- [ ] 🟡🧹 キーボード並び替えで `order` が更新されず、再読み込みで並びが戻る。並べ替え時に `order` を再計算する。 (`src/hooks/useKeyboardNav.ts`)
- [ ] 🟡❓ `src/lib/migration.ts` の `migrateToFirebase` がどこからも呼ばれていない。移行機能が不要なら削除、必要なら認証完了時に呼び出す。**要決定** (`src/lib/migration.ts`)
- [ ] 🟡🧹 グループD&Dの並び替えで全グループの `order` を付け直すため、ピン/非ピンの順序が不意に崩れる可能性がある。セクション内のみで `order` を更新する。 (`src/hooks/useDashboardDnD.ts`)
- [ ] 🟡✨ 背景スクリプトで追加されたグループが、開いているダッシュボードに即時反映されない。`chrome.storage.onChanged` でローカル更新を監視する。 (`src/hooks/useGroups.ts`)
- [ ] 🟡🧹 `GroupCard` の `newTitle` が外部更新と同期されず、同期更新後の編集で古いタイトルが出る。`group.title` 変更時に state を更新する。 (`src/features/dashboard/GroupCard.tsx`)
- [ ] 🟢🧹 `Enter` キー処理に到達不能な分岐があるため整理する。 (`src/hooks/useKeyboardNav.ts`)
- [ ] 🟢🪲 `updateGroupData` の失敗時に状態がローカルと不整合のままになる。失敗時のリロード/ロールバックを追加する。 (`src/hooks/useGroups.ts`)
- [ ] 🟢✨ `GroupCard` や `TabCard` のアイコンボタンに `aria-label` がなく、アクセシビリティが不十分。適切なラベルを付与する。 (`src/features/dashboard/GroupCard.tsx`, `src/features/dashboard/TabCard.tsx`)
- [ ] 🟢✨ UIのテキスト(Archive, Delete等)がハードコードされている。i18n対応の準備として定数化または `chrome.i18n` 化を検討する。 (`src/constants.ts`, components)
- [ ] 🟢🪲 `constants.ts` がモジュール読み込み時に `chrome.runtime` を参照し、テスト環境で例外になる可能性がある。遅延評価かガードを入れる。 (`src/constants.ts`)
- [ ] 🟢🧹 `initFirebaseSync` がシングルトンで、複数コンシューマーがマウントすると最初のunmountで全体のsyncが停止する。現在は `useGroups` のみが使用するため問題ないが、将来の拡張に備えてContext providerかref-countingパターンへのリファクタを検討する。 (`src/lib/storage.ts`)

## Done

- [x] 🚨🪲 `archiveTabs` が `await` 中に再実行されるとタブ保存と削除が競合し、データ重複やエラーが起きる。処理中の重複実行をロックする。 ✅
- [x] 🚨🪲 `initFirebaseSync` の購読解除がなく、アンマウント後もポーリングが残る。クリーンアップ用の unsubscribe を `useGroups` から返して破棄する。 ✅
- [x] 🚨🪲 既存グループのローカル変更が「Remote Wins」で上書きされる。LWW実装。 ✅ https://github.com/mtskf/Staaaash/pull/27
- [x] 🚨🪲 `storage.set` が Firebase 失敗時に例外。Fire-and-forget化。 ✅ https://github.com/mtskf/Staaaash/pull/29
- [x] 🚨🪲 ポーリングが未変更でも書き戻し。ハッシュ検出でスキップ。 ✅ https://github.com/mtskf/Staaaash/pull/30
