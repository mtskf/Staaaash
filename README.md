<p align="center">
  <img src="public/logo.png" width="300" alt="Staaaash" />
</p>

<p align="center">
  <strong>The modern, minimalist tab manager for Chrome.</strong><br/>
  Save your tabs now. Restore them when you're ready.
</p>

<p align="center">
  <a href="#-why-staaaash">Why Staaaash</a> •
  <a href="#-shortcuts">Shortcuts</a> •
  <a href="#-installation--development">Install</a> •
  <a href="#-license">License</a>
</p>

---

## ✨ Why Staaaash?

Declutter your browser and your mind. Staaaash helps you organize tabs into named groups so you can focus on the task at hand.

| Feature | Description |
|---------|-------------|
| 🗂 **Smart Grouping** | Save all tabs in your window to a named collection with one click |
| 🔀 **Merge Groups** | Shift+Drag one group onto another to combine them |
| 📌 **Pin & Organize** | Pin important groups to the top, collapse them, drag-and-drop to reorder |
| ⚡️ **Lightning Fast** | Instant load times and snappy interactions.
| 🔄 **Cloud Sync** | Seamlessly sync your stash across all your devices using your Google account.
| 🔒 **Secure & Private** | Data is stored locally and only synced to your private Firebase path upon login.
| ⌨️ **Keyboard First** | Navigate, organize, and manage everything without touching your mouse.
| 🌚 **Dark Mode** | Beautifully designed for any lighting condition.

---

## ⌨️ Shortcuts

| Shortcut | Action |
|:--------:|--------|
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>.</kbd> | Archive all tabs in current window |
| <kbd>↵</kbd> | Rename selected group |
| <kbd>⌘</kbd> <kbd>↵</kbd> | Restore selected item |
| <kbd>⌫</kbd> | Delete selected item |
| <kbd>P</kbd> | Pin/Unpin selected group |
| <kbd>Esc</kbd> | Cancel editing |
| <kbd>↑</kbd> <kbd>↓</kbd> | Navigate through items |
| <kbd>←</kbd> <kbd>→</kbd> | Collapse / Expand group |

---

## 🛠️ Development Setup

### 1. Prerequisites
- Node.js (v18+)
- pnpm

### 2. Clone & Install
```bash
git clone https://github.com/mtskf/Staaaash.git
cd Staaaash
pnpm install
```

### 3. Firebase & Google Auth Configuration
Staaaash uses Firebase for sync and Google Auth for identity.

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project.
   - Enable **Authentication** and **Realtime Database**.

2. **Register a Web App**
   - In Project Settings > General, click the `</>` icon to add a web app.
   - Copy the configuration keys (apiKey, authDomain, etc.).

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your Firebase config values in `.env`.

4. **Setup Google OAuth (Important)**
   - To make `chrome.identity` work, you need a specific OAuth Client ID.
   - Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials.
   - Create a **OAuth 2.0 Client ID** (Type: **Web application**, NOT Chrome Extension).
   - **Authorized Redirect URIs**: Add `https://<YOUR-EXTENSION-ID>.chromiumapp.org/`
     - *Note: You can get your Extension ID from `chrome://extensions` after loading the unpacked extension once.*
   - Add this Client ID to `.env` as `VITE_GOOGLE_CLIENT_ID`.
   - In Firebase Console > Authentication > Sign-in method, ensure **Google** provider is enabled and whitelisted with this Client ID.

### 4. Build & Run
```bash
# Start Dev Server (HMR)
pnpm run dev

# Build for production
pnpm run build
```

**Load in Chrome:**
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` directory

---

## 📦 Release Workflow

```bash
# 1. Bump version in package.json and manifest.json
# 2. Build
pnpm run build

# 3. Package
cd dist && zip -r ../release/staaaash-vX.X.X.zip .
```

---

## 🔧 Tech Stack

| Category | Technologies |
|----------|-------------|
| Core | TypeScript, React 19, Chrome Extension Manifest V3 |
| Backend | Firebase Realtime Database (REST API), Google OAuth via `chrome.identity` |
| UI | Tailwind CSS v3, shadcn/ui (Radix), lucide-react, sonner |
| DnD | @dnd-kit/core, @dnd-kit/sortable |
| Tooling | pnpm, Vite, ESLint, Vitest |

---

## 📄 License

MIT © [mtskf](https://github.com/mtskf)
