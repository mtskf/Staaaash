import { storage } from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { TabItem, Group } from '../types';

chrome.action.onClicked.addListener(async () => {
  // 1. Get all tabs in current window
  const currentWindow = await chrome.windows.getCurrent();
  if (!currentWindow.id) return;

  const tabs = await chrome.tabs.query({ windowId: currentWindow.id });

  // Filter out extension pages (Dashboard, etc.)
  const extensionPrefix = `chrome-extension://${chrome.runtime.id}`;
  const tabsToArchive = tabs.filter(t => t.url && !t.url.startsWith(extensionPrefix));

  // 2. Format tabs
  const tabItems: TabItem[] = tabsToArchive.map(t => ({
    id: t.id?.toString() || uuidv4(),
    url: t.url || '',
    title: t.title || 'New Tab',
    favIconUrl: t.favIconUrl
  }));

  if (tabItems.length === 0) return;

  // 3. Save to storage
  const newGroup: Group = {
    id: uuidv4(),
    title: `Archive ${new Date().toLocaleString()}`,
    items: tabItems,
    pinned: false,
    collapsed: true,
    order: Date.now(),
    createdAt: Date.now()
  };

  // Check types compatibility or use storage.addGroup helper if available.
  // storage.addGroup implementation:
  /*
    addGroup: async (group: Group) => {
      const data = await methods.get();
      const newGroups = [group, ...data.groups];
      await methods.save(newGroups);
    },
  */
  // I need to be sure about the 'Group' interface structure. I recall it has 'items'.

  await storage.addGroup(newGroup);

  // 4. Open Dashboard
  await chrome.tabs.create({ url: `index.html?newGroupId=${newGroup.id}` });

  // 5. Close original tabs
  // 5. Close original tabs
  const tabIds = tabsToArchive.map(t => t.id).filter((id): id is number => id !== undefined);
  if (tabIds.length > 0) {
    await chrome.tabs.remove(tabIds);
  }
});

// Context Menu to open Collections page
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-collections",
    title: "Open Collections",
    contexts: ["action"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-collections") {
    chrome.tabs.create({ url: "index.html" });
  }
});
