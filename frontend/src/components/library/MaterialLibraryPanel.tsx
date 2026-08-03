import { useState } from 'react';
import { FolderX, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { CategoryCard } from './CategoryCard';
import { deleteClips } from '@/api/client';

export function MaterialLibraryPanel() {
  const { library, libraryLoading, refreshLibrary } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [error, setError] = useState('');

  const totalClips = library?.groups.reduce((acc, g) => acc + g.count, 0) ?? 0;
  const allClipIds =
    library?.groups.flatMap((g) => g.clips.map((c) => c.id)) ?? [];
  const allSelected = totalClips > 0 && selectedIds.size === totalClips;

  const toggleClip = (clipId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) next.delete(clipId);
      else next.add(clipId);
      return next;
    });
  };

  const selectCategory = (category: string, select: boolean) => {
    const ids =
      library?.groups
        .find((g) => g.category === category)
        ?.clips.map((c) => c.id) ?? [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const selectAll = (select: boolean) => {
    setSelectedIds(select ? new Set(allClipIds) : new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定删除选中的 ${selectedIds.size} 个素材吗？此操作不可恢复。`)) return;
    setBatchDeleting(true);
    setError('');
    try {
      await deleteClips(Array.from(selectedIds));
      setSelectedIds(new Set());
      await refreshLibrary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBatchDeleting(false);
    }
  };

  if (libraryLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold text-text">素材库</h2>
        <div className="flex flex-1 items-center justify-center text-sm text-muted">扫描中...</div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold text-text">素材库</h2>
        <div className="flex flex-1 items-center justify-center text-sm text-muted">暂无素材</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text">素材库</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {totalClips} 个素材
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-primary"
          onClick={() => refreshLibrary()}
          title="刷新素材库"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {library.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {library.errors.length} 个文件探测失败
        </div>
      )}

      {totalClips > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border-border text-primary focus:ring-primary"
              checked={allSelected}
              onChange={(e) => selectAll(e.target.checked)}
              title={allSelected ? '取消全选' : '全选所有素材'}
            />
            <span className="text-xs text-muted">
              已选 {selectedIds.size} / {totalClips}
            </span>
          </div>
          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0 || batchDeleting}
            className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {batchDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            批量删除
          </button>
        </div>
      )}

      {error && <div className="text-xs text-red-500">{error}</div>}

      <div className="flex flex-col gap-2">
        {library.groups.map((group) => (
          <CategoryCard
            key={group.category}
            group={group}
            selectedIds={selectedIds}
            onToggle={toggleClip}
            onSelectCategory={(select) => selectCategory(group.category, select)}
            onChanged={refreshLibrary}
          />
        ))}
      </div>

      {library.missing_categories.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          缺少分类：{library.missing_categories.join('、')}
        </div>
      )}

      {library.unknown_folders.length > 0 && (
        <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted">
          <div className="mb-1 flex items-center gap-1">
            <FolderX className="h-3 w-3" />
            未识别的文件夹
          </div>
          {library.unknown_folders.join('、')}
        </div>
      )}
    </div>
  );
}
