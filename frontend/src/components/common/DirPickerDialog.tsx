import { useEffect, useState } from 'react';
import { ChevronLeft, FolderOpen } from 'lucide-react';
import { browseFiles } from '@/api/client';
import type { BrowseItem } from '@/types';
import { Button } from './Button';

interface DirPickerDialogProps {
  initialPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function DirPickerDialog({ initialPath, onSelect, onClose }: DirPickerDialogProps) {
  const [current, setCurrent] = useState(initialPath);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    browseFiles(current)
      .then((res) => {
        setItems(res.items.filter((i) => i.is_dir));
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [current]);

  const parent = current.split('/').slice(0, -1).join('/') || '/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-text">选择目录</h3>
          <button className="text-muted hover:text-text" onClick={onClose}>✕</button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted">
          <Button variant="ghost" size="sm" onClick={() => setCurrent(parent)} disabled={current === '/'}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="truncate">{current}</span>
        </div>

        <div className="h-72 overflow-y-auto px-2 pb-2">
          {loading && <div className="py-8 text-center text-sm text-muted">加载中...</div>}
          {error && <div className="py-4 text-center text-sm text-red-500">{error}</div>}
          {!loading && items.length === 0 && <div className="py-8 text-center text-sm text-muted">没有子目录</div>}
          {items.map((item) => (
            <button
              key={item.path}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-panelHover"
              onClick={() => setCurrent(item.path)}
            >
              <FolderOpen className="h-4 w-4 text-yellow-500" />
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={() => onSelect(current)}>选择当前目录</Button>
        </div>
      </div>
    </div>
  );
}
