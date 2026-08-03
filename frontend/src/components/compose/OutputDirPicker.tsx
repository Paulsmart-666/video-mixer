import { useState } from 'react';
import { MonitorDown, HardDrive, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '../common/Button';

export function OutputDirPicker() {
  const { form, pickLocalDir, clearLocalDir } = useAppStore();
  const [error, setError] = useState('');

  const supportsLocal = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const handlePickLocal = async () => {
    setError('');
    try {
      await pickLocalDir();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-muted">导出文件夹</label>

      <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <MonitorDown className="h-4 w-4 shrink-0 text-primary" />
            {form.localDirName ? (
              <span className="truncate text-text" title={form.localDirName}>
                本机：{form.localDirName}
              </span>
            ) : (
              <span className="text-muted">未选择本机文件夹</span>
            )}
          </div>
          {form.localDirName ? (
            <button
              className="shrink-0 text-xs text-muted hover:text-red-500"
              onClick={clearLocalDir}
              title="清除"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handlePickLocal} disabled={!supportsLocal}>
            <HardDrive className="mr-1 h-3.5 w-3.5" />
            选择本机文件夹
          </Button>
          {form.localDirName && (
            <Button variant="ghost" size="sm" onClick={handlePickLocal}>
              更改
            </Button>
          )}
        </div>
        {!supportsLocal && (
          <p className="text-xs text-amber-600">
            当前浏览器不支持选择本机文件夹，成片将自动下载到浏览器默认下载目录。
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
