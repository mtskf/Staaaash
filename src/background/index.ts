import { storage } from './storage';
import { v4 as uuidv4 } from 'uuid';
import type { TabItem, Group } from '../types';

// Helper function to archive tabs in a window
async function archiveTabs(windowId: number, newGroupId?: string) {
  const tabs = await chrome.tabs.query({ windowId });

  // Filter out extension pages (Dashboard, etc.)
  const extensionPrefix = `chrome-extension://${chrome.runtime.id}`;
  const tabsToArchive = tabs.filter(t => t.url && !t.url.startsWith(extensionPrefix));

  // Dedup by URL
  const uniqueTabs = new Map<string, TabItem>();
  tabsToArchive.forEach(t => {
    const url = t.url || '';
    if (!uniqueTabs.has(url)) {
      uniqueTabs.set(url, {
        id: t.id?.toString() || uuidv4(),
        url: url,
        title: t.title || 'New Tab',
        favIconUrl: t.favIconUrl
      });
    }
  });

  const tabItems: TabItem[] = Array.from(uniqueTabs.values());
  if (tabItems.length === 0) return;

  // Save to storage
  const groupId = newGroupId || uuidv4();
  const newGroup: Group = {
    id: groupId,
    title: `Archive ${new Date().toLocaleString()}`,
    items: tabItems,
    pinned: false,
    collapsed: true,
    order: Date.now(),
    createdAt: Date.now()
  };

  await storage.addGroup(newGroup);

  // Find existing Collections tabs in this window and close them
  const existingCollectionsTabs = tabs.filter(t =>
    t.url?.startsWith(extensionPrefix) && t.url?.includes('index.html')
  );
  const existingTabIds = existingCollectionsTabs
    .map(t => t.id)
    .filter((id): id is number => id !== undefined);

  // Open new Dashboard tab
  await chrome.tabs.create({ url: `index.html?newGroupId=${groupId}` });

  // Close original tabs (excluding any existing Collections tabs which we'll also close)
  const tabIds = tabsToArchive.map(t => t.id).filter((id): id is number => id !== undefined);
  const allTabsToClose = [...tabIds, ...existingTabIds];

  if (allTabsToClose.length > 0) {
    await chrome.tabs.remove(allTabsToClose);
  }
}

chrome.action.onClicked.addListener(async () => {
  const currentWindow = await chrome.windows.getCurrent();
  if (!currentWindow.id) return;
  await archiveTabs(currentWindow.id);
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

// Keyboard shortcut command listener
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "archive-tabs") {
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) return;
    await archiveTabs(currentWindow.id);
  }
});
