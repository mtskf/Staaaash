# Lessons Learned

## Chrome Extension Development

### Manifest V3 & Content Security Policy (CSP)
- **Challenge**: Firebase Realtime Database JS SDK creates internal workers or uses `eval`-like constructs that are strictly blocked by Manifest V3's CSP.
- **Solution**: Use the **REST API** for database operations. It requires no external script execution and is fully compliant.
- **Trade-off**: You lose WebSocket-based "real-time" listeners. You must implement polling logic manually.

### 3-Way Merge for Sync
- **Challenge**: In a master-less sync system, distinguishing between "New Local Item" and "Remotely Deleted Item" is impossible with just 2 states (Local vs Remote).
- **Lesson**: Always track a **Base State** (Last Synced State).
    - `Local present, Remote missing, Base present` = Deleted Remotely.
    - `Local present, Remote missing, Base missing` = Created Locally.
