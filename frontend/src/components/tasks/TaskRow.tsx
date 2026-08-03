import { useState } from 'react';
import { CheckCircle, Download, Loader2, PauseCircle, XCircle, FileVideo } from 'lucide-react';
import { downloadUrl } from '@/api/client';
import type { TaskItem } from '@/types';
import { ProgressBar } from './ProgressBar';

interface TaskRowProps {
  task: TaskItem;
}

function statusIcon(status: string) {
  switch (status) {
    case 'done':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'queued':
      return <PauseCircle className="h-4 w-4 text-muted" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-muted" />;
    default:
      return <FileVideo className="h-4 w-4 text-muted" />;
  }
}

function statusText(status: string) {
  const map: Record<string, string> = {
    done: '完成',
    running: '合成中',
    queued: '排队',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[status] || status;
}

export function TaskRow({ task }: TaskRowProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-panel p-3">
      <div className="flex items-center gap-2">
        {statusIcon(task.status)}
        <span className="flex-1 truncate text-sm font-medium text-text" title={task.filename}>
          {task.filename}
        </span>
        <span className="text-xs text-muted">{statusText(task.status)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.segments.map((seg) => (
          <span
            key={seg.clip_id}
            className="rounded-md border border-border bg-panelHover px-1.5 py-0.5 text-xs text-muted"
            title={seg.name}
          >
            {seg.category}: {seg.name}
          </span>
        ))}
      </div>

      <ProgressBar progress={task.progress} status={task.status} />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>预估 {task.est_duration.toFixed(1)}s</span>
        <div className="flex items-center gap-2">
          {task.status === 'failed' && task.error && (
            <button className="text-red-400 hover:text-red-300" onClick={() => setShowError(!showError)}>
              详情
            </button>
          )}
          {task.status === 'done' && task.output_path && (
            <a
              href={downloadUrl(task.output_path)}
              download
              className="flex items-center gap-1 text-primary hover:text-primaryHover"
            >
              <Download className="h-3.5 w-3.5" />
              下载
            </a>
          )}
        </div>
      </div>

      {showError && task.error && (
        <div className="max-h-32 overflow-auto rounded-md bg-red-50 p-2 text-xs text-red-600">
          {task.error}
        </div>
      )}
    </div>
  );
}
