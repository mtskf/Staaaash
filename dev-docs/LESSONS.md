# Lessons Learned

## Chrome Extension Development

### Manifest V3 & Content Security Policy (CSP)
- **Challenge**: Firebase JS SDK uses workers/`eval` blocked by MV3 CSP.
- **Solution**: Use the **REST API** for DB operations.
- **Trade-off**: No WebSocket listeners; implement polling.

### 3-Way Merge for Sync
- **Challenge**: Local vs Remote alone cannot detect remote deletions.
- **Lesson**: Always keep a **Base State** (Last Synced).
  - Local present + Remote missing + Base present = Deleted remotely.
  - Local present + Remote missing + Base missing = Created locally.
