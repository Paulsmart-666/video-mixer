import { useAppStore } from '@/store/useAppStore';
import { BatchToolbar } from './BatchToolbar';
import { TaskRow } from './TaskRow';

export function TaskListPanel() {
  const { currentBatch } = useAppStore();

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">产出进度</h2>
        {currentBatch && (
          <span className="text-xs text-muted">
            {currentBatch.done}/{currentBatch.total} 完成
            {currentBatch.failed > 0 && ` · ${currentBatch.failed} 失败`}
          </span>
        )}
      </div>

      <BatchToolbar />

      {!currentBatch && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-panel text-sm text-muted">
          暂无合成任务
        </div>
      )}

      {currentBatch && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {currentBatch.planning_note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {currentBatch.planning_note}
            </div>
          )}
          {currentBatch.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
