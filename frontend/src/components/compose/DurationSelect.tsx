import { Select } from '../common/Select';
import { DURATION_OPTIONS } from '@/types';

interface DurationSelectProps {
  value: number;
  onChange: (value: number) => void;
}

export function DurationSelect({ value, onChange }: DurationSelectProps) {
  return (
    <Select
      label="成片时长限制"
      options={DURATION_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
