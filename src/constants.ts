
export const STORAGE_KEY = 'staaaash-storage';
export const EXTENSION_PREFIX =
  typeof chrome !== 'undefined' && chrome.runtime?.id
    ? `chrome-extension://${chrome.runtime.id}`
    : '';
export const DEFAULT_GROUP_TITLE = 'Archive';

// Drag & Drop Types
export const DND_TYPE_GROUP = 'group';
export const DND_TYPE_TAB = 'tab';
