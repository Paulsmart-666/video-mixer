import { useState } from 'react';
import { FolderOpen, MonitorDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '../common/Button';
import { DirPickerDialog } from '../common/DirPickerDialog';

export function OutputDirPicker() {
  const { settings, updateSettings } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const current = settings?.output_dir || '';

  const handleSelect = async (path: string) => {
    setDialogOpen(false);
    setError('');
    try {
      // 持久化到后端 settings.output_dir，合成时成片写入该目录（而非后端运行目录）
      await updateSettings({ output_dir: path });
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
            {current ? (
              <span className="truncate text-text" title={current}>
                {current}
              </span>
            ) : (
              <span className="text-muted">未选择导出文件夹</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
            <FolderOpen className="mr-1 h-3.5 w-3.5" />
            {current ? '更改导出文件夹' : '选择导出文件夹'}
          </Button>
        </div>
        <p className="text-xs text-muted">
          成片将保存到所选文件夹（默认 <code>{settings?.output_dir || 'output/'}</code>），
          可直接选择其子目录进行分类存放。
        </p>
      </div>

      {dialogOpen && (
        <DirPickerDialog
          initialPath={current || settings?.output_dir || ''}
          onSelect={handleSelect}
          onClose={() => setDialogOpen(false)}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
