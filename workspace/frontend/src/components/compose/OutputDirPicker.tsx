import { useState } from 'react';
import { FolderOpen, MonitorDown } from 'lucide-react';
import { Button } from '../common/Button';

interface LocalEntry {
  name: string;
  is_dir: boolean;
}

// File System Access API 的类型在部分 TS  (config) 下缺失，用宽松类型兜底
type DirHandle = any;

export function OutputDirPicker() {
  const [dirHandle, setDirHandle] = useState<DirHandle | null>(null);
  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [error, setError] = useState('');

  const pick = async () => {
    setError('');
    const w = window as unknown as {
      showDirectoryPicker?: () => Promise<DirHandle>;
    };
    if (!w.showDirectoryPicker) {
      setError('当前浏览器不支持选择本机文件夹，请改用 Chrome / Edge 等 Chromium 内核浏览器');
      return;
    }
    try {
      const handle = await w.showDirectoryPicker();
      const list: LocalEntry[] = [];
      // FileSystemDirectoryHandle.entries() 遍历目录内容，读取本地文件夹结构
      for await (const [name, child] of (handle as any).entries()) {
        list.push({ name: name as string, is_dir: (child as any).kind === 'directory' });
      }
      list.sort(
        (a, b) =>
          Number(b.is_dir) - Number(a.is_dir) || a.name.localeCompare(b.name, 'zh'),
      );
      setDirHandle(handle);
      setEntries(list);
    } catch (e) {
      const err = e as Error;
      if (err.name !== 'AbortError') setError(err.message || '选择文件夹失败');
    }
  };

  const dirName = dirHandle?.name ?? '';

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-muted">导出文件夹（本地）</label>

      <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <MonitorDown className="h-4 w-4 shrink-0 text-primary" />
            {dirName ? (
              <span className="truncate text-text" title={dirName}>
                {dirName}
              </span>
            ) : (
              <span className="text-muted">未选择本地文件夹</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={pick}>
            <FolderOpen className="mr-1 h-3.5 w-3.5" />
            {dirName ? '重新选择本地文件夹' : '选择导出文件夹'}
          </Button>
        </div>

        {dirName && (
          <p className="text-xs text-muted">
            已读取本地目录「{dirName}」，共 {entries.length} 项。
          </p>
        )}

        {entries.length > 0 && (
          <div className="max-h-44 overflow-y-auto rounded bg-panel/60 p-2 text-xs">
            {entries.map((e) => (
              <div key={e.name} className="flex items-center gap-2 py-1">
                <FolderOpen className="h-3.5 w-3.5 text-yellow-500" />
                <span className="truncate">{e.name}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted">
          所选目录为你的本机文件夹（可读取与浏览）。远程部署下成片仍保存在服务端，请在任务列表点击「下载」取回。
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
