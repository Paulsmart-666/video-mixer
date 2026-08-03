import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Film, Trash2, Upload, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { CategoryGroup, MaterialClip } from '@/types';
import { deleteClip, uploadClip } from '@/api/client';

interface CategoryCardProps {
  group: CategoryGroup;
  selectedIds: Set<string>;
  onToggle: (clipId: string) => void;
  onSelectCategory: (select: boolean) => void;
  onChanged: () => void;
}

export function CategoryCard({
  group,
  selectedIds,
  onToggle,
  onSelectCategory,
  onChanged,
}: CategoryCardProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = group.clips.filter((c) => selectedIds.has(c.id)).length;
  const allSelected = group.clips.length > 0 && selectedCount === group.clips.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    let hasError = '';
    for (const file of Array.from(files)) {
      try {
        await uploadClip(group.category, file);
      } catch (e) {
        hasError = (e as Error).message;
      }
    }
    setUploading(false);
    if (hasError) setError(hasError);
    onChanged();
  };

  const handleDelete = async (clip: MaterialClip, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定删除素材「${clip.name}」吗？此操作不可恢复。`)) return;
    setDeleting(clip.id);
    setError('');
    try {
      await deleteClip(clip.id);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex flex-1 items-center gap-2 text-left">
          {group.clips.length > 0 && (
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border-border text-primary focus:ring-primary"
              checked={allSelected}
              onChange={(e) => onSelectCategory(e.target.checked)}
              title={allSelected ? '取消全选' : '全选该分类'}
            />
          )}
          <button
            className="flex flex-1 items-center gap-2 text-left hover:opacity-80"
            onClick={() => setOpen(!open)}
          >
            <Film className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-text">{group.category}</span>
            <span className="text-xs text-muted">{group.count} 个素材</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="导入本地视频到该分类"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            导入
          </button>
          <button className="text-muted hover:text-text" onClick={() => setOpen(!open)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <div className="px-3 pb-2 text-xs text-red-500">{error}</div>}

      <div className={clsx('overflow-hidden transition-all', open ? 'max-h-96' : 'max-h-0')}>
        <div className="max-h-80 overflow-y-auto border-t border-border px-3 py-1.5">
          {group.clips.length === 0 ? (
            <div className="py-2 text-xs text-muted">暂无素材，点击「导入」添加</div>
          ) : (
            group.clips.map((clip) => (
              <div
                key={clip.id}
                className="group flex items-center justify-between rounded-md py-1 pr-1 text-xs transition-colors hover:bg-panelHover"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3 w-3 cursor-pointer rounded border-border text-primary focus:ring-primary"
                    checked={selectedIds.has(clip.id)}
                    onChange={() => onToggle(clip.id)}
                    title="选择该素材"
                  />
                  <span className="truncate text-text" title={clip.name}>
                    {clip.name}
                  </span>
                </div>
                <button
                  className="shrink-0 text-muted opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  onClick={(e) => handleDelete(clip, e)}
                  disabled={deleting === clip.id}
                  title="删除素材"
                >
                  {deleting === clip.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
