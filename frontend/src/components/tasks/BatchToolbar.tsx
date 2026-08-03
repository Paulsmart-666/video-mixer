import { Square, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '../common/Button';

export function BatchToolbar() {
  const { currentBatch, cancelCurrentBatch, setCurrentBatch } = useAppStore();
  if (!currentBatch) return null;

  const canStop = currentBatch.status === 'running';

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-panel p-3">
      <div className="text-sm text-text">
        批次 <span className="font-mono text-primary">#{currentBatch.batch_id}</span>
      </div>
      <div className="flex items-center gap-2">
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
  );
}
