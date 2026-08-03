import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { getSettings } from '@/api/client';
import { ComposePanel } from '@/components/compose/ComposePanel';
import { TopBar } from '@/components/layout/TopBar';
import { MaterialLibraryPanel } from '@/components/library/MaterialLibraryPanel';
import { TaskListPanel } from '@/components/tasks/TaskListPanel';
import { useAppStore } from '@/store/useAppStore';

const MIN_LEFT_WIDTH = 220;
const DEFAULT_LEFT_WIDTH = 280;
const MAX_LEFT_WIDTH = 520;

function loadLeftWidth(): number {
  try {
    const raw = localStorage.getItem('mixer.leftWidth');
    if (raw) {
      const w = parseInt(raw, 10);
      if (!Number.isNaN(w)) return Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, w));
    }
  } catch {
    // ignore
  }
  return DEFAULT_LEFT_WIDTH;
}

export default function App() {
  const { setForm, refreshLibrary, restoreLocalDir } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leftWidth, setLeftWidth] = useState(loadLeftWidth);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await getSettings();
        if (!mounted) return;
        if (settings.output_dir) {
          setForm({ output_dir: settings.output_dir });
        }
        await restoreLocalDir();
        await refreshLibrary();
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setForm, refreshLibrary, restoreLocalDir]);

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent) => {
      const w = Math.max(MIN_LEFT_WIDTH, Math.min(MAX_LEFT_WIDTH, e.clientX));
      setLeftWidth(w);
    };
    const handleUp = () => {
      setResizing(false);
      try {
        localStorage.setItem('mixer.leftWidth', String(leftWidth));
      } catch {
        // ignore
      }
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, leftWidth]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-muted">
        初始化中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-red-400">
        初始化失败: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <TopBar />
      <main className="flex flex-1 overflow-hidden border-t border-border bg-border">
        <section className="min-h-0 overflow-y-auto bg-bg" style={{ width: leftWidth }}>
          <MaterialLibraryPanel />
        </section>
        <div
          className={clsx(
            'w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/40 active:bg-primary/60',
            resizing && 'bg-primary/60'
          )}
          onMouseDown={() => setResizing(true)}
          title="拖拽调节素材库宽度"
        />
        <section className="min-h-0 flex-1 overflow-hidden bg-bg">
          <ComposePanel />
        </section>
        <section className="min-h-0 w-[380px] overflow-hidden bg-bg">
          <TaskListPanel />
        </section>
      </main>
    </div>
  );
}
