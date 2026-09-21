import { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, Loader2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AUTOMATIC_BACKUP_UPDATED_EVENT, getLastAutomaticBackupAt, getLastExportedBackupAt } from '@/lib/backup';
import { getSyncStatus, isConnected, isSyncing, subscribeSyncActivity } from '@/lib/syncClient';

const DataSafetyStatus = () => {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => ({
    connected: isConnected(), syncing: isSyncing(), sync: getSyncStatus(),
    automaticBackupAt: getLastAutomaticBackupAt(), exportedBackupAt: getLastExportedBackupAt(),
  }));

  useEffect(() => {
    const refresh = () => setSnapshot({
      connected: isConnected(), syncing: isSyncing(), sync: getSyncStatus(),
      automaticBackupAt: getLastAutomaticBackupAt(), exportedBackupAt: getLastExportedBackupAt(),
    });
    const unsubscribe = subscribeSyncActivity(refresh);
    window.addEventListener(AUTOMATIC_BACKUP_UPDATED_EVENT, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(AUTOMATIC_BACKUP_UPDATED_EVENT, refresh);
    };
  }, []);

  const failed = snapshot.connected && !!snapshot.sync.lastErrorAt
    && (!snapshot.sync.lastOkAt || snapshot.sync.lastErrorAt > snapshot.sync.lastOkAt);
  const Icon = snapshot.syncing ? Loader2 : failed ? ShieldAlert : snapshot.connected ? CheckCircle2 : CloudOff;
  const headline = snapshot.syncing ? 'Syncing your changes…'
    : failed ? 'Sync needs attention'
      : snapshot.connected ? 'Saved on this device and synced'
        : 'Saved on this device';
  const backupAt = snapshot.automaticBackupAt ?? snapshot.exportedBackupAt;
  const detail = snapshot.connected && snapshot.sync.lastOkAt
    ? `Last synced ${new Date(snapshot.sync.lastOkAt).toLocaleString()}`
    : backupAt ? `Last backup ${new Date(backupAt).toLocaleString()}`
      : 'No off-device backup is recorded yet';

  return (
    <Button
      type="button" variant="outline"
      className={`mb-5 h-auto w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left ${failed ? 'border-destructive/50' : ''}`}
      onClick={() => navigate('/settings#data')}
    >
      <Icon className={`h-5 w-5 shrink-0 ${snapshot.syncing ? 'animate-spin' : failed ? 'text-destructive' : 'text-emerald-500'}`} />
      <span className="min-w-0">
        <span className="block font-medium">{headline}</span>
        <span className="block text-xs font-normal text-muted-foreground">{detail}</span>
      </span>
    </Button>
  );
};

export default DataSafetyStatus;
