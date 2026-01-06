
/**
 * Wrapper for chrome.i18n.getMessage.
 * Provides a safe way to retrieve localized strings in both the extension environment
 * (where chrome.i18n is available) and test/dev environments (where it might not be).
 *
 * @param key - The name of the message, as specified in the messages.json file.
 * @param substitutions - Up to 9 substitution strings, if the message supports them.
 * @returns The localized string or the key itself if localization fails or API is unavailable.
 */
export const t = (key: string, substitutions?: string | string[]): string => {
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }
  // Fallback for environments without chrome.i18n (e.g., tests, storybook)
  // In a real app we might want a mock implementation here, but returning the key is sufficient for now.
  return key;
};
