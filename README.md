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

## 🛠️ Installation & Development

```bash
# Clone the repository
git clone https://github.com/mtskf/Staaaash.git
cd Staaaash

# Install dependencies
pnpm install

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

## 📄 License

MIT © [mtskf](https://github.com/mtskf)
