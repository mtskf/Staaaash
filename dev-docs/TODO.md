# TODO

- [x] 🚨🪲 既存グループのローカル変更が「Remote Wins」で上書きされるため、オフライン編集や反映遅延時に変更が消える。更新時刻/バージョンを使った3-way merge、または差分マージを実装する。 (`src/lib/sync-utils.ts`, `src/lib/storage.ts`) ✅ PR #27
- [x] 🚨🪲 `storage.set` が `syncToFirebase` の失敗(オフライン等)で例外を投げ、ローカル保存も失敗したように振る舞う。非同期でバックグラウンド実行するか、失敗をキャッチしてキューに入れる。 (`src/lib/storage.ts`) ✅ https://github.com/mtskf/Staaaash/pull/29
- [x] 🚨🪲 ポーリング結果を無条件にローカルへ書き戻すため、リモートが古い場合にローカル変更が巻き戻る。ETag/更新ハッシュ比較や変更検出を入れて、未変更ならマージ・保存をスキップする。 (`src/lib/firebase.ts`, `src/lib/storage.ts`) ✅ https://github.com/mtskf/Staaaash/pull/30
- [ ] 🚨🪲 `initFirebaseSync` の購読解除がなく、アンマウント後もポーリングが残る。クリーンアップ用の unsubscribe を `useGroups` から返して破棄する。 (`src/lib/storage.ts`, `src/hooks/useGroups.ts`)
- [ ] 🟡🧹 キーボード並び替えで `order` が更新されず、再読み込みで並びが戻る。並べ替え時に `order` を再計算する。 (`src/hooks/useKeyboardNav.ts`)
- [ ] 🟡🪲 `archiveTabs` が `await` 中に再実行されるとタブ保存と削除が競合し、データ重複やエラーが起きる。処理中の重複実行をロックする。 (`src/background/index.ts`)
- [ ] 🟡🧹 `src/lib/migration.ts` の `migrateToFirebase` がどこからも呼ばれていない。`chrome.storage.sync` からの移行が必要なら、認証完了時や起動時に呼び出す。 (`src/components/AuthButton.tsx` or `src/lib/firebase.ts`)
- [ ] 🟡🧹 グループD&Dの並び替えで全グループの `order` を付け直すため、ピン/非ピンの順序が不意に崩れる可能性がある。セクション内のみで `order` を更新する。 (`src/hooks/useDashboardDnD.ts`)
- [ ] 🟡✨ 背景スクリプトで追加されたグループが、開いているダッシュボードに即時反映されない。`chrome.storage.onChanged` でローカル更新を監視する。 (`src/hooks/useGroups.ts`)
- [ ] 🟡🧹 `GroupCard` の `newTitle` が外部更新と同期されず、同期更新後の編集で古いタイトルが出る。`group.title` 変更時に state を更新する。 (`src/features/dashboard/GroupCard.tsx`)
- [ ] 🟢🧹 `Enter` キー処理に到達不能な分岐があるため整理する。 (`src/hooks/useKeyboardNav.ts`)
- [ ] 🟢🪲 `updateGroupData` の失敗時に状態がローカルと不整合のままになる。失敗時のリロード/ロールバックを追加する。 (`src/hooks/useGroups.ts`)
- [ ] 🟢✨ `GroupCard` や `TabCard` のアイコンボタンに `aria-label` がなく、アクセシビリティが不十分。適切なラベルを付与する。 (`src/features/dashboard/GroupCard.tsx`, `src/features/dashboard/TabCard.tsx`)
- [ ] 🟢✨ UIのテキスト(Archive, Delete等)がハードコードされている。i18n対応の準備として定数化または `chrome.i18n` 化を検討する。 (`src/constants.ts`, components)
- [ ] 🟢🪲 `constants.ts` がモジュール読み込み時に `chrome.runtime` を参照し、テスト環境で例外になる可能性がある。遅延評価かガードを入れる。 (`src/constants.ts`)
