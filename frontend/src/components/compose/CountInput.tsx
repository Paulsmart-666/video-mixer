interface CountInputProps {
  value: number;
  onChange: (value: number) => void;
  maxCombo: number;
}

export function CountInput({ value, onChange, maxCombo }: CountInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted">产出数量</label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={500}
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          className="w-24 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-text outline-none focus:border-primary"
        />
        <span className="text-xs text-muted">条成片</span>
      </div>
      <div className="text-xs text-muted">最多可生成 {maxCombo.toLocaleString()} 种不重复组合</div>
      {value > maxCombo && (
        <div className="text-xs text-yellow-400">超出最大组合数，实际只能生成 {maxCombo} 条</div>
      )}
    </div>
  );
}
