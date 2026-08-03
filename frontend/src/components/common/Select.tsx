import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

interface Option<T extends string | number> {
  label: string;
  value: T;
}

interface SelectProps<T extends string | number>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function Select<T extends string | number>({
  options,
  onChange,
  label,
  className,
  value,
  ...rest
}: SelectProps<T>) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && <label className="text-xs text-muted">{label}</label>}
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-border bg-panel px-3 py-2 pr-8 text-sm text-text outline-none focus:border-primary"
          {...rest}
          value={String(value)}
          onChange={(e) => {
            const opt = options.find((o) => String(o.value) === e.target.value);
            onChange((opt ? opt.value : e.target.value) as T);
          }}
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
