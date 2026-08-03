import { clsx } from 'clsx';
import { FRAMEWORK_LABELS, type FrameworkType } from '@/types';

interface FrameworkSelectorProps {
  value: FrameworkType;
  onChange: (value: FrameworkType) => void;
  missingPreRoll: boolean;
}

export function FrameworkSelector({ value, onChange, missingPreRoll }: FrameworkSelectorProps) {
  const options: FrameworkType[] = ['framework_4', 'framework_3'];

  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((fw) => {
        const disabled = fw === 'framework_4' && missingPreRoll;
        return (
          <button
            key={fw}
            disabled={disabled}
            onClick={() => onChange(fw)}
            className={clsx(
              'flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors',
              value === fw
                ? 'border-primary bg-primary/10'
                : 'border-border bg-panel hover:bg-panelHover',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="text-sm font-medium text-text">{fw === 'framework_4' ? '框架1' : '框架2'}</span>
            <span className="text-xs text-muted">{FRAMEWORK_LABELS[fw]}</span>
            {disabled && <span className="mt-1 text-xs text-red-500">缺少「前贴」素材</span>}
          </button>
        );
      })}
    </div>
  );
}
