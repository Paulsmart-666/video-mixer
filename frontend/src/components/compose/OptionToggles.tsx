import { useRef, useState, type ChangeEvent } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Switch } from '../common/Switch';
import { uploadBgm } from '@/api/client';

export function OptionToggles() {
  const { form, setOption } = useAppStore();
  const opts = form.options;
  const fileRef = useRef<HTMLInputElement>(null);
  const [bgmUploading, setBgmUploading] = useState(false);
  const [bgmError, setBgmError] = useState('');

  const handleBgmChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgmUploading(true);
    setBgmError('');
    try {
      const res = await uploadBgm(file);
      setOption('bgm_path', res.path);
    } catch (err) {
      setBgmError((err as Error).message);
    } finally {
      setBgmUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
      {opts.watermark && (
        <div className="px-2 pb-1">
          <input
            type="text"
            className="w-full rounded border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-primary"
            placeholder="输入水印文字"
            value={opts.watermark_text}
            onChange={(e) => setOption('watermark_text', e.target.value)}
          />
        </div>
      )}
      <Switch label="BGM" checked={opts.bgm} onChange={(v) => setOption('bgm', v)} />
      {opts.bgm && (
        <div className="flex flex-col gap-1 px-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-xs text-text hover:bg-panelHover"
              onClick={() => fileRef.current?.click()}
              disabled={bgmUploading}
            >
              {bgmUploading ? '上传中...' : '上传音频'}
            </button>
            {opts.bgm_path && (
              <span className="truncate text-xs text-muted" title={opts.bgm_path}>
                {opts.bgm_path.split(/[\\/]/).pop()}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleBgmChange}
            />
          </div>
          {bgmError && <span className="text-xs text-red-500">{bgmError}</span>}
        </div>
      )}
      <Switch label="人声统一" checked={opts.voice_normalize} onChange={(v) => setOption('voice_normalize', v)} />
    </div>
  );
}
