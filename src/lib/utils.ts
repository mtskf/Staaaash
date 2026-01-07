import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { t } from './i18n';

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
    return t('time_just_now');
  } else if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return t(mins === 1 ? 'time_min_ago' : 'time_mins_ago', String(mins));
  } else if (diff < 24 * hour) {
      // Check if it's "Yesterday"
      const date = new Date(timestamp);
      const today = new Date();
      if (date.getDate() !== today.getDate()) {
           return t('time_yesterday');
      }
      const hours = Math.floor(diff / hour);
      return t(hours === 1 ? 'time_hour_ago' : 'time_hours_ago', String(hours));
  }

  // Check if Yesterday (if > 24h but still previous calendar day logic covered above roughly, but let's be strict about "Yesterday")
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
      return t('time_yesterday');
  }

  if (diff < 7 * day) {
    const days = Math.floor(diff / day);
    return t(days === 1 ? 'time_day_ago' : 'time_days_ago', String(days));
  }

  // Otherwise return date format YYYY/MM/DD
  return date.toLocaleDateString();
}
