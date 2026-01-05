# Decisions Log

## 2026-01-02: Firebase REST API for Sync
- **Context**: Firebase JS SDK violates Manifest V3 CSP (`eval`/workers).
- **Decision**: Use Firebase Realtime Database **REST API**.
- **Consequences**:
  - Polling instead of real-time listeners (`setTimeout`).
  - Manual token handling (`chrome.identity`).
  - MV3-compliant.

## 2026-01-02: 3-Way Merge for Sync
- **Context**: Naive sync resurrected remotely deleted groups.
- **Decision**: Store `Last Synced State` (Base) and do **3-Way Merge**.
- **Logic**:
  - `Local` present, `Remote` missing:
    - `Base` present → deleted remotely → delete locally.
    - `Base` missing → new local → keep + push remote.
- **Consequences**: Correct deletions without tombstones.

## 2026-01-05: Last Write Wins (LWW) for Conflicts
- **Context**: "Remote wins" lost local edits.
- **Decision**: Add `updatedAt` to `Group` and apply LWW in merge.
- **Logic**:
  - Compare `updatedAt` (fallback `createdAt`).
  - Newer version overwrites older.
- **Consequences**: Preserves offline edits when newer.

## 2026-01-05: Fire-and-Forget Firebase Sync
- **Context**: Awaiting Firebase made local saves fail offline.
- **Decision**: Sync in background (non-blocking).
- **Logic**:
  - Save to `chrome.storage.local`.
  - Update Base (`saveLastSynced`).
  - Background Firebase sync; log errors, retry on next poll.
- **Consequences**: Local saves always succeed; eventual consistency.

## 2026-01-05: Hash-Based Change Detection for Polling
- **Context**: Polling triggered merge/save even when remote was unchanged.
- **Decision**: Track a hash of last remote data; skip if unchanged.
- **Logic**:
  - Hash remote groups each poll.
  - Skip merge/save/callback on same hash.
  - Reset hash on auth change or sync failure.
- **Consequences**: Fewer writes and re-renders.

## 2024-12-25: UI Library Choice
- **Decision**: Use shadcn/ui + Tailwind CSS.
- **Rationale**: Accessible components with full styling control; faster UI build.

## 2024-12-25: Drag and Drop Library
- **Decision**: Use `@dnd-kit`.
- **Rationale**: Modern, lightweight, accessible; better React compatibility.

## 2024-12-26: Tailwind Version
- **Decision**: Stick with Tailwind CSS v3.
- **Rationale**: v4 breaks PostCSS/shadcn themes; v3 is stable.

## 2024-12-26: Toast Notifications
- **Decision**: Use `sonner`.
- **Rationale**: Lightweight, customizable, and shadcn/ui friendly.

## 2026-01-05: Background Script Build Configuration
- **Context**: Background script imports `lib/storage.ts` which imports Firebase with `import.meta.env.VITE_*`.
- **Decision**: Define `import.meta.env` as `{DEV:false}` in esbuild, making all VITE_* return `undefined`.
- **Logic**:
  - esbuild replaces `import.meta.env` with `{DEV:false}`.
  - VITE_* properties are `undefined`, fall back to `''` via `|| ''`.
  - Firebase initializes with empty config but `getCurrentUser()` returns `null`.
  - `syncToFirebase()` exits early when user is `null`.
- **Consequences**:
  - Background script can share storage code without Firebase auth.
  - Any new `import.meta.env.*` usage in background code will be `undefined`.
  - If Firebase features are needed in background, env vars must be explicitly defined.

## 2024-12-26: Simplification
- **Decision**: Remove tooltips.
- **Rationale**: Keep UI clean; shortcuts documented elsewhere.

---

# Lessons Learned

## Manifest V3 & Content Security Policy (CSP)
- **Challenge**: Firebase JS SDK uses workers/`eval` blocked by MV3 CSP.
- **Solution**: Use the **REST API** for DB operations.
- **Trade-off**: No WebSocket listeners; implement polling.

## 3-Way Merge for Sync
- **Challenge**: Local vs Remote alone cannot detect remote deletions.
- **Lesson**: Always keep a **Base State** (Last Synced).
  - Local present + Remote missing + Base present = Deleted remotely.
  - Local present + Remote missing + Base missing = Created locally.
