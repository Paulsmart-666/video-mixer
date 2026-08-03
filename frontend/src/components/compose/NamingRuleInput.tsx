import { useAppStore } from '@/store/useAppStore';

const PLACEHOLDERS = [
  { key: '{n}', label: '序号' },
  { key: '{date}', label: '实时日期' },
  { key: '{pre}', label: '前贴名' },
  { key: '{opening}', label: '开头名' },
  { key: '{middle}', label: '中间名' },
  { key: '{ending}', label: '结尾名' },
];

const FIXED_TAGS = [
  { key: '编导钰岩', label: '编导钰岩' },
  { key: '自产宇蒙', label: '自产宇蒙' },
];

export function NamingRuleInput() {
  const { form, setForm } = useAppStore();

  const insert = (key: string) => {
    const input = document.getElementById('naming-rule') as HTMLInputElement;
    if (!input) return;
    const start = input.selectionStart || form.naming_rule.length;
    const newValue = form.naming_rule.slice(0, start) + key + form.naming_rule.slice(start);
    setForm({ naming_rule: newValue });
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + key.length, start + key.length);
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-muted">文件命名规则</label>
      <input
        id="naming-rule"
        type="text"
        value={form.naming_rule}
        onChange={(e) => setForm({ naming_rule: e.target.value })}
        className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />
      <div className="flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.key}
            onClick={() => insert(p.key)}
            className="rounded-md border border-border bg-panelHover px-2 py-0.5 text-xs text-muted hover:text-text"
          >
            {p.label}
          </button>
        ))}
        {FIXED_TAGS.map((p) => (
          <button
            key={p.key}
            onClick={() => insert(p.key)}
            className="rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
