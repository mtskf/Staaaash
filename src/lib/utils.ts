import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'Just now';
  } else if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  } else if (diff < 24 * hour) {
      // Check if it's "Yesterday"
      const date = new Date(timestamp);
      const today = new Date();
      if (date.getDate() !== today.getDate()) {
           return 'Yesterday';
      }
      const hours = Math.floor(diff / hour);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Check if Yesterday (if > 24h but still previous calendar day logic covered above roughly, but let's be strict about "Yesterday")
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
  }

  if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Otherwise return date format YYYY/MM/DD
  return date.toLocaleDateString();
}
