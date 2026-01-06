# High-Priority Refactoring Plan (TODO L11-L14)

## Overview

2つのリファクタリング、命名修正、テスト追加を行い、保守性を向上させる。

| # | Task | Scope | Branch |
|---|------|-------|--------|
| 1 | mergeGroups命名 | [S] 2 files | `refactor/rename-merge-groups` |
| 2 | GroupOps集約 | [M] 3 files | `refactor/group-operations` |
| 3 | Sync分割 | [M] 2 files | `refactor/sync-manager` |
| 4 | Hooksテスト追加 | [M] 3 files | `test/hooks-coverage` |

---

## 🔧 開発ルール (Global Settings)

- コミット前に `git status` で未コミットの変更がないか確認 (警告)
- ⚠️ TDD必須: テストを先に書いてから実装 (Red -> Green -> Refactor)
- ⚠️ `main` から `<type>/<context>` 形式でブランチ作成
- ⚠️ 過度な抽象化を避け、シンプルな構造を優先
- lint/test 通過後にコミット・PR作成
- 🚫 PRマージは許可後のみ
- コード内コメント・コミットは英語
- ⚠️ 強調にはボールド記法を使用せず、絵文字や見出しを活用する

---

## Phase 1: mergeGroups命名

📌 Branch: `refactor/rename-merge-groups` (← `main` から分岐)

### 目的
logic.ts (`mergeGroups`) と sync-utils.ts (`mergeGroupsThreeWay`) の混同を避ける。
TODO指定通り `mergeGroupsIntoTarget` へリネーム。

### TDD方針 (最小限のRedステップ)
純粋なリネームでもTDD必須ルールに従い、以下の手順で Red -> Green を実施する。

1.  テストファイル (`logic.test.ts`) の関数名を先に変更 → 🔴 Red (コンパイルエラー/テスト失敗)
2.  実装ファイル (`logic.ts`) の関数名を変更 → 🟢 Green
3.  呼び出し元 (`useDashboardDnD.ts`) を修正
4.  `test` & `lint` 通過を確認

### 変更内容

#### `src/lib/logic.ts`
- `mergeGroups` -> `mergeGroupsIntoTarget`
- JSDoc: "Merge source group into target group (for Shift+Drag operations)"

#### `src/lib/logic.test.ts`
- `mergeGroups` -> `mergeGroupsIntoTarget`

#### `src/hooks/useDashboardDnD.ts`
- import/call 修正

### 検証
```bash
# 1. 全参照箇所の確認 (rgで検索)
rg "mergeGroups" src/
# 2. テスト実行
pnpm test && pnpm lint
```

---

## Phase 2: GroupOps集約

📌 Branch: `refactor/group-operations` (← `main` から分岐)

### 目的
`useKeyboardNav.ts` のロジックを `logic.ts` へ委譲。共通フック化はせず、シンプルに純関数を利用する (方針A)。

### 設計: グループ並び替え (`reorderGroup`)

#### 前提条件
- 入力配列 `groups` は `Pinned` グループが先頭にまとまっている (`Pinned First`) 状態であることを呼び出し元 (`useGroups` 等) が保証する。
- 保証方法: `useGroups` で `groups` を取得・更新する際に `pinned` フラグでソートする (既存実装に確認済み)。
- 関数内でのソートは行わない。

#### 仕様
- 入力: `groups` (配列), `groupId` (対象), `direction` ('up'|'down')
- 境界: `Pinned` / `Unpinned` セクション境界を越える移動は不可。
- 異常系: `groupId` が存在しない場合は、変更せず戻る。
- 端点: 移動先がない場合 (Top/Bottom) は、変更せず戻る。
- 戻り値:
    - 変更あり: 新しい配列を返す (Immutability)。
    - 変更なし: パフォーマンスのため元の配列参照を返すが、テストでは値の一致 (`toEqual`) を優先確認する。
    - 📋 参照維持は任意 (最適化目的)。テストで `.toBe` は不要。

#### 入出力例 (期待値)
```typescript
// Setup: P=Pinned, U=Unpinned
// Input Groups: [P1, P2, U1, U2]

// Normal Move (Pinned)
reorderGroup(groups, 'P1', 'down') -> [P2, P1, U1, U2] (New Array)

// Boundary Block (Pinned trying to enter Unpinned)
reorderGroup(groups, 'P2', 'down') -> [P1, P2, U1, U2] (No Change)

// Invalid ID
reorderGroup(groups, 'XX', 'up')   -> [P1, P2, U1, U2] (No Change)
```

### TDD: テスト先行 (Red)

#### `src/lib/logic.test.ts`
```typescript
describe('reorderGroup', () => {
  const groups = [p1, p2, u1, u2];

  it('swaps P1 and P2 when P1 moves down', () => {
    const result = reorderGroup(groups, 'p1', 'down');
    expect(result.map(g => g.id)).toEqual(['p2', 'p1', 'u1', 'u2']);
    // New array check implies immutability
    expect(result).not.toBe(groups);
  });

  it('returns same groups when local move is invalid (boundary)', () => {
    const result = reorderGroup(groups, 'p2', 'down');
    expect(result).toEqual(groups);
  });

  // 追加ケース
  it('moves U1 down within unpinned section', () => {
    const result = reorderGroup(groups, 'u1', 'down');
    expect(result.map(g => g.id)).toEqual(['p1', 'p2', 'u2', 'u1']);
  });

  it('blocks U1 from moving into pinned section', () => {
    const result = reorderGroup(groups, 'u1', 'up');
    expect(result).toEqual(groups);
  });

  it('returns same groups for invalid groupId', () => {
    const result = reorderGroup(groups, 'invalid', 'up');
    expect(result).toEqual(groups);
  });

  // 端点no-opケース
  it('returns same groups when P1 moves up (already at top)', () => {
    const result = reorderGroup(groups, 'p1', 'up');
    expect(result).toEqual(groups);
  });

  it('returns same groups when U2 moves down (already at bottom)', () => {
    const result = reorderGroup(groups, 'u2', 'down');
    expect(result).toEqual(groups);
  });
});
```

### 実装 (Green)

#### `src/lib/logic.ts`
- `reorderGroup` 関数を追加

#### `src/hooks/useKeyboardNav.ts`
- `moveTabToGroup` (既存) と `reorderGroup` (新規) を利用してインラインロジックを置換

### 検証
```bash
pnpm test src/lib/logic.test.ts
# Manual: Check keyboard Shift+Arrow (Up/Down) behavior
```

---

## Phase 3: Sync分割

📌 Branch: `refactor/sync-manager` (← `main` から分岐)

### 目的
`storage.ts` から同期ロジックを `sync.ts` モジュールへ分離。

### 設計: `sync.ts`

#### 同期戦略 (Sync Strategy)
既存の `firebase.ts` を活用しつつ、初期ロードの信頼性を向上させる。二重管理を避けるため、Polling自体は `firebase.subscribeToGroups` に委譲する。

1.  ⚡ Initial Load (Retryあり): `startSync` 呼び出し時に `getGroupsFromFirebase` を実行。ルールに従い、この呼び出しにはリトライ処理 (最大3回, バックオフ) を適用する。
2.  🔁 Polling (Background): 初期ロード完了後、`firebase.subscribeToGroups` を開始して定期更新を受け取る。
    - 📋 Polling失敗時: ログ出力のみ。次回インターバルで自動リトライされるため、即時リトライは不要。

#### 仕様
- `startSync(onGroupsUpdated)`:
    - 既存の購読があれば停止。
    - Initial Fetch (with Retry) -> 成功時 `onGroupsUpdated`。
    - Start Polling -> 更新時 `onGroupsUpdated`。
    - 戻り値: `stopSync` 関数。
- `stopSync()`:
    - 購読解除。

#### 競合対策 (Race Condition)
- `startSync` が短時間に多重呼び出しされた場合、古いリクエストの結果が新しい状態に反映されるリスクがある。
- 対策: 実行ID (`syncId`) を保持し、コールバック時にIDが一致しなければ結果を破棄 (stale result discard)。

#### 例外処理フロー
- Initial Fetch 失敗: 最大3回リトライ (指数バックオフ: 1s, 2s, 4s)。全失敗時はログ出力し、`onGroupsUpdated` は呼ばない (現状維持)。
- Initial Fetch 失敗後も Polling は開始する (復旧の機会を提供)。
- Polling 失敗: ログ出力のみ。`subscribeToGroups` は内部で次回インターバルで自動リトライする (firebase.ts L188-189 確認済み)。

### TDD: テスト先行 (Red)

#### `src/lib/sync.test.ts`
```typescript
describe('sync module', () => {
  // モック戦略: vi.mock('@/lib/firebase') で getGroupsFromFirebase / subscribeToGroups をモック

  it('performs initial fetch with retries on startSync');
  it('starts polling after initial fetch');
  it('starts polling even after initial fetch fails'); // 失敗後もPolling開始
  it('does not call onGroupsUpdated when all retries fail'); // リトライ全失敗時
  it('stops polling on stopSync');
  it('discards stale result when startSync called twice quickly'); // Race condition
});
```

### 実装 (Green)

#### `src/lib/sync.ts`
- `startSync` / `stopSync` 実装
- `retryFetch` ユーティリティの実装 (or `sync-utils` 等への配置)

#### `src/lib/storage.ts`
- `initFirebaseSync` -> `sync.startSync` に置換。

### 検証
```bash
pnpm test src/lib/sync.test.ts
pnpm test src/lib/storage.test.ts
```

---

## Phase 4: Hooksテスト追加

📌 Branch: `test/hooks-coverage` (← `main` から分岐)

### 目的
Hookの統合的な振る舞いのみを検証。

🎯 テスト意図: UIイベントが正しく状態変更やストア更新につながることを確認する。ロジック詳細は `logic.test.ts` で担保。

### TDD: テスト作成

#### `src/hooks/useDashboardDnD.test.ts`
- Target: `onDragEnd` (Action) -> `storage` 更新 (Effect)
- Case: `onDragEnd` (Group reorder) calls `updateGroups` correctly.

#### `src/hooks/useKeyboardNav.test.ts`
- Target: Key Press (Action) -> State Change
- Case: `ArrowDown` updates hook state (`selectedId`).

### 実装 (Green)
- テストコード記述のみ

### 検証
```bash
pnpm test --coverage
```

---

## レビュー指摘への対応判断

以下はレビューで指摘されたが、変更不要と判断した項目とその理由。

| 指摘 | 判断 | 理由 |
|---|---|---|
| Phase 2: 関数内で pinned-first を検証すべき | 不採用 | 呼び出し元 (`useGroups`) での保証が明確であり、関数内検証は責務の重複。シンプルさ優先。 |
| Phase 3: 全 API 呼び出しにリトライ必須 | 部分採用 | Polling は次回インターバルで自動リトライされるため即時リトライは冗長。Initial Load のみリトライで十分。 |
| Phase 4: Hooks テストを更に削減 | 不採用 | 既に各1ケースに絞り込み済み。これ以上の削減は検証不足のリスク。 |
| Phase 3: 独自ポーリング実装は二重化リスク | 解決済み | 設計で `firebase.subscribeToGroups` に委譲と明記。二重実装は発生しない。 |
| Phase 1: TDD例外の承認フロー | 解決済み | 例外ではなく最小限のRedステップを実施するよう変更済み。承認フロー不要。 |
| Phase 2: 端点テスト不足 | 採用 | 境界テストケースを追加済み。 |
| Phase 3: 競合リスク | 採用 | stale result 破棄の設計を追加済み。 |
| Phase 3: try-catch設計不足 | 採用 | 例外処理フローを追加済み。 |
| Phase 4: テスト意図不明確 | 採用 | テスト意図を1行で明記済み。 |
| Phase 1: 全参照検索不足 | 採用 | rg検索手順を追加済み。 |
| 致命的エラーの分類 | 不採用 | Sync分割の目的はリファクタリング。エラー分類は MVP に不要。 |
| 参照維持の測定方針 | 不採用 | 参照維持は任意と明記済み。パフォーマンス測定は将来課題。 |
| バックオフ戦略未定義 | 解決済み | 指数バックオフ (1s, 2s, 4s) を明記済み。 |
| Hooks テスト環境 | 解決済み | 既存環境 (vitest + @testing-library/react) で対応可能。 |
| ブランチ起点明示不足 | 採用 | 各Phase冒頭に `main` から分岐を追記済み。 |
| 初期ロード失敗時に空配列 | 採用 | 既存状態維持に変更済み。空配列でデータ消失リスク回避。 |
| 初期ロード失敗後のPolling開始 | 採用 | 失敗後もPolling開始し復旧機会を提供。 |
| subscribeToGroupsリトライ不明 | 解決済み | firebase.ts L188-189 で次回インターバルで自動リトライ確認済み。 |
| sync.tsテスト詳細不足 | 部分採用 | リトライ全失敗・失敗後Polling開始のテストケースを追加済み。 |
| Phase 2テスト網羅性不足 | 採用 | 端点no-opケース (P1 up, U2 down) を追加済み。計7テストケース。 |
| TDD例外の整合性 | 採用 | 最小限のRedステップ (テスト先行リネーム) を実施するよう変更済み。ルール遵守。 |

---

## 修正後のチェックリスト

- [ ] `git status` でクリーン確認
- [ ] Branch: `main` から分岐
- [ ] Red: テスト失敗確認 (全Phase)
- [ ] Green: 実装・テスト通過
- [ ] Refactor: 整理・ lint 通過
- [ ] PR: `<type>/<context>` ブランチからマージ申請
