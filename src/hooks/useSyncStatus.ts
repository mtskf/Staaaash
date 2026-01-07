import { useState, useEffect } from 'react';
import { subscribeSyncStatus } from '@/lib/storage';
import type { SyncStatus } from '@/types';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle', error: null });

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}
