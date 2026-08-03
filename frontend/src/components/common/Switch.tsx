import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

export function Switch({ label, onChange, checked, disabled, hint }: SwitchProps) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-center justify-between rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-panelHover',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      title={hint}
    >
      <div className="flex flex-col">
        <span className="text-sm text-text">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      <div className="relative inline-flex h-5 w-9 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={clsx(
            'absolute inset-0 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-primary/50',
            checked ? 'bg-primary' : 'bg-border',
          )}
        />
        <span
          className={clsx(
            'absolute left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </div>
    </label>
  );
}
