import { RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { t } from '@/lib/i18n';

export function SyncIndicator() {
  const { state } = useSyncStatus();

  if (state === 'idle') {
    return null;
  }

  if (state === 'syncing') {
    return (
      <span title={t('sync_syncing')}>
        <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      </span>
    );
  }

  if (state === 'synced') {
    return (
      <span title={t('sync_synced')}>
        <Cloud className="h-4 w-4 text-green-500" />
      </span>
    );
  }

  // state === 'error'
  return (
    <span title={t('sync_error')}>
      <CloudOff className="h-4 w-4 text-red-500" />
    </span>
  );
}
