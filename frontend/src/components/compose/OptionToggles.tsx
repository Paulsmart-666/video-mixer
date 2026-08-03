import { useAppStore } from '@/store/useAppStore';
import { Switch } from '../common/Switch';

export function OptionToggles() {
  const { form, setOption } = useAppStore();
  const opts = form.options;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-panel p-2">
      <Switch label="转场" checked={opts.transition} onChange={(v) => setOption('transition', v)} />
      <Switch
        label="字幕"
        checked={opts.subtitle}
        onChange={() => {}}
        disabled
        hint="首期占位，需后续接入字幕文件"
      />
      <Switch label="水印" checked={opts.watermark} onChange={(v) => setOption('watermark', v)} />
      <Switch label="BGM" checked={opts.bgm} onChange={(v) => setOption('bgm', v)} />
      <Switch label="人声统一" checked={opts.voice_normalize} onChange={(v) => setOption('voice_normalize', v)} />
    </div>
  );
}
