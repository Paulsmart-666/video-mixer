import { useState } from 'react';
import { Square, Trash2, Download } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { batchDownloadUrl } from '@/api/client';
import { Button } from '../common/Button';

export function BatchToolbar() {
  const { currentBatch, cancelCurrentBatch, setCurrentBatch } = useAppStore();
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  if (!currentBatch) return null;

  const canStop = currentBatch.status === 'running';
  const doneCount = currentBatch.tasks.filter((t) => t.status === 'done' && t.output_path).length;
  const canBatchDownload = ['completed', 'partial'].includes(currentBatch.status) && doneCount > 0;

  const handleBatchDownload = async () => {
    if (!canBatchDownload) return;
    setZipError(null);
    setZipLoading(true);
    try {
      const resp = await fetch(batchDownloadUrl(currentBatch.batch_id));
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        setZipError(`批量下载失败 (${resp.status}): ${text.slice(0, 120)}`);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentBatch.batch_id}_videos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setZipError(`批量下载出错: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-text">
          批次 <span className="font-mono text-primary">#{currentBatch.batch_id}</span>
          <span className="ml-2 text-xs text-muted">已完成 {doneCount}/{currentBatch.total}</span>
        </div>
        <div className="flex items-center gap-2">
          {canBatchDownload && (
            <Button variant="primary" size="sm" onClick={handleBatchDownload} disabled={zipLoading}>
              <Download className="mr-1 h-3.5 w-3.5" />
              {zipLoading ? '打包中…' : '批量下载'}
            </Button>
          )}
          {canStop && (
            <Button variant="danger" size="sm" onClick={cancelCurrentBatch}>
              <Square className="mr-1 h-3.5 w-3.5" />
              停止
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCurrentBatch(null)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            清空
          </Button>
        </div>
      </div>
      {zipError && (
        <div className="max-h-24 overflow-auto rounded-md bg-red-50 p-2 text-xs text-red-600">
          {zipError}
        </div>
      )}
    </div>
  );
}
