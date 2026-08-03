import { useState } from 'react';
import { FolderOpen, RefreshCw, Settings } from 'lucide-react';
import { updateSettings } from '@/api/client';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '../common/Button';
import { DirPickerDialog } from '../common/DirPickerDialog';
import { APP_VERSION } from '@/version';

export function TopBar() {
  const { settings, refreshLibrary, updateSettings: updateStoreSettings } = useAppStore();
  const [picking, setPicking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handlePick = async (path: string) => {
    setPicking(false);
    try {
      await updateSettings({ material_root: path });
      await updateStoreSettings({ material_root: path });
    } catch (e) {
      alert('切换目录失败: ' + (e as Error).message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLibrary();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-panel px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Settings className="h-5 w-5" />
        </div>
        <h1 className="text-base font-semibold text-text">视频混剪工具</h1>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          v{APP_VERSION}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm">
          <FolderOpen className="h-4 w-4 text-muted" />
          <span className="max-w-[240px] truncate text-muted">{settings?.material_root || '未设置'}</span>
          <button className="text-primary hover:text-primaryHover" onClick={() => setPicking(true)}>修改</button>
        </div>
        <Button variant="default" size="sm" loading={refreshing} onClick={handleRefresh}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          刷新
        </Button>
        {settings && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
            {settings.ffmpeg_ok ? 'ffmpeg ✓' : 'ffmpeg ✗'} · {settings.encoder_name}
          </span>
        )}
      </div>

      {picking && (
        <DirPickerDialog
          initialPath={settings?.material_root || '/workspace'}
          onSelect={handlePick}
          onClose={() => setPicking(false)}
        />
      )}
    </header>
  );
}
