import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { FRAMEWORK_SEQUENCE } from '@/types';
import { Button } from '../common/Button';
import { CountInput } from './CountInput';
import { DurationSelect } from './DurationSelect';
import { FrameworkSelector } from './FrameworkSelector';
import { NamingRuleInput } from './NamingRuleInput';
import { OptionToggles } from './OptionToggles';
import { OutputDirPicker } from './OutputDirPicker';

export function ComposePanel() {
  const { library, form, setForm, startCompose, currentBatch, batchError } = useAppStore();
  const [starting, setStarting] = useState(false);

  const groups = useMemo(() => {
    const map = new Map(library?.groups.map((g) => [g.category, g]) ?? []);
    return map;
  }, [library]);

  const missingPreRoll = !groups.get('前贴') || groups.get('前贴')!.count === 0;
  const missingCore = ['口播开头', '口播中间', '口播结尾'].some((cat) => {
    const g = groups.get(cat as any);
    return !g || g.count === 0;
  });

  const maxCombo = useMemo(() => {
    const cats = form.framework === 'framework_4'
      ? ['前贴', '口播开头', '口播中间', '口播结尾']
      : ['口播开头', '口播中间', '口播结尾'];
    return cats.reduce((acc, cat) => acc * (groups.get(cat as any)?.count || 0), 1);
  }, [groups, form.framework]);

  const slots = useMemo(
    () =>
      FRAMEWORK_SEQUENCE[form.framework].map((cat) => ({
        category: cat,
        count: groups.get(cat)?.count ?? 0,
      })),
    [groups, form.framework],
  );

  const durationFeasible = useMemo(() => {
    if (!form.max_duration) return true;
    const cats = form.framework === 'framework_4'
      ? ['前贴', '口播开头', '口播中间', '口播结尾']
      : ['口播开头', '口播中间', '口播结尾'];
    const min = cats.reduce((acc, cat) => {
      const clips = groups.get(cat as any)?.clips || [];
      return acc + (clips.length ? Math.min(...clips.map((c) => c.duration)) : 0);
    }, 0);
    return min <= form.max_duration;
  }, [groups, form.framework, form.max_duration]);

  const canStart = !missingCore && !(form.framework === 'framework_4' && missingPreRoll) && durationFeasible;

  const handleStart = async () => {
    setStarting(true);
    try {
      await startCompose();
    } catch (e) {
      alert('合成失败: ' + (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div>
        <h2 className="mb-1 text-base font-semibold text-text">爆款合成</h2>
        <p className="text-xs text-muted">按框架结构排列组合：每个槽位各取 1 个素材交叉拼接</p>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <label className="mb-3 block text-xs text-muted">选择框架</label>
        <FrameworkSelector
          value={form.framework}
          onChange={(v) => setForm({ framework: v })}
          missingPreRoll={missingPreRoll}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {slots.map((slot, idx) => (
            <Fragment key={slot.category}>
              <div
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
                  slot.count > 0 ? 'border-border bg-panel' : 'border-amber-300 bg-amber-50',
                )}
              >
                <span className="text-xs font-medium text-text">{slot.category}</span>
                <span
                  className={clsx(
                    'rounded-full px-1.5 text-[10px] font-medium',
                    slot.count > 0 ? 'bg-primary/10 text-primary' : 'bg-amber-200 text-amber-700',
                  )}
                >
                  {slot.count}
                </span>
              </div>
              {idx < slots.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-panel p-4">
        <CountInput value={form.count} onChange={(v) => setForm({ count: v })} maxCombo={maxCombo || 1} />
        <DurationSelect value={form.max_duration} onChange={(v) => setForm({ max_duration: v })} />
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <label className="mb-2 block text-xs text-muted">合成选项（适用于全部批量任务）</label>
        <OptionToggles />
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <NamingRuleInput />
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <OutputDirPicker />
      </div>

      {!durationFeasible && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          当前框架下最短组合时长已超过成片时长限制，请放宽限制或添加更短素材。
        </div>
      )}

      {batchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {batchError}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        loading={starting || currentBatch?.status === 'running'}
        disabled={!canStart}
        onClick={handleStart}
        className="mt-auto"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        开始合成
      </Button>
    </div>
  );
}
