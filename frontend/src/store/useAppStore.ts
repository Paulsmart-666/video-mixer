// 全局状态管理（zustand）
import { create } from 'zustand';
import type {
  BatchState,
  ComposeOptions,
  FrameworkType,
  LibrarySnapshot,
  SettingsResponse,
} from '@/types';
import * as api from '@/api/client';

export interface ComposeForm {
  framework: FrameworkType;
  count: number;
  max_duration: number;
  naming_rule: string;
  output_dir: string;
  localDirName?: string;
  options: ComposeOptions;
}

interface AppState {
  settings: SettingsResponse | null;
  library: LibrarySnapshot | null;
  libraryLoading: boolean;
  form: ComposeForm;
  currentBatch: BatchState | null;
  batchError: string | null;
  _pollTimer: ReturnType<typeof setInterval> | null;

  setForm: (partial: Partial<ComposeForm>) => void;
  setOption: (key: keyof ComposeOptions, value: unknown) => void;
  refreshLibrary: () => Promise<void>;
  restoreLocalDir: () => void;
  startCompose: () => Promise<void>;
  cancelCurrentBatch: () => Promise<void>;
  setCurrentBatch: (batch: BatchState | null) => void;
  updateSettings: (partial: {
    material_root?: string;
    output_dir?: string;
    concurrency?: number;
  }) => Promise<void>;
  pickLocalDir: () => Promise<void>;
  clearLocalDir: () => void;
}

const defaultOptions: ComposeOptions = {
  transition: false,
  subtitle: false,
  watermark: false,
  bgm: false,
  voice_normalize: false,
  transition_type: 'fade',
  transition_duration: 0.5,
  watermark_text: '',
  bgm_path: null,
  bgm_volume: 0.25,
};

const initialForm: ComposeForm = {
  framework: 'framework_4',
  count: 10,
  max_duration: 0,
  naming_rule: '随机组合+前贴+口播+{n}',
  output_dir: '',
  localDirName: undefined,
  options: { ...defaultOptions },
};

export const useAppStore = create<AppState>()((set, get) => ({
  settings: null,
  library: null,
  libraryLoading: false,
  form: initialForm,
  currentBatch: null,
  batchError: null,
  _pollTimer: null,

  setForm: (partial) => set((s) => ({ form: { ...s.form, ...partial } })),

  setOption: (key, value) =>
    set((s) => ({ form: { ...s.form, options: { ...s.form.options, [key]: value } } })),

  refreshLibrary: async () => {
    set({ libraryLoading: true });
    try {
      const lib = await api.refreshLibrary();
      set({ library: lib });
    } catch (e) {
      console.error('扫描素材库失败', e);
    } finally {
      set({ libraryLoading: false });
    }
  },

  restoreLocalDir: () => {
    try {
      const name = localStorage.getItem('mixer.localDirName');
      if (name) set((s) => ({ form: { ...s.form, localDirName: name } }));
    } catch {
      // ignore
    }
  },

  startCompose: async () => {
    const { form } = get();
    set({ batchError: null });
    const old = get()._pollTimer;
    if (old) clearInterval(old);
    try {
      const batch = await api.createCompose({
        framework: form.framework,
        count: form.count,
        max_duration: form.max_duration,
        options: form.options,
        naming_rule: form.naming_rule,
        output_dir: form.output_dir,
      });
      set({ currentBatch: batch });
      const timer = setInterval(async () => {
        try {
          const b = await api.getBatch(batch.batch_id);
          set({ currentBatch: b });
          if (b.status !== 'running') {
            const cur = get()._pollTimer;
            if (cur) clearInterval(cur);
            set({ _pollTimer: null });
          }
        } catch {
          // 瞬时错误，继续轮询
        }
      }, 1500);
      set({ _pollTimer: timer });
    } catch (e) {
      set({ batchError: (e as Error).message });
      throw e;
    }
  },

  cancelCurrentBatch: async () => {
    const b = get().currentBatch;
    if (!b) return;
    try {
      const updated = await api.cancelBatch(b.batch_id);
      set({ currentBatch: updated });
    } catch (e) {
      console.error('停止批次失败', e);
    }
  },

  setCurrentBatch: (batch) => {
    const cur = get()._pollTimer;
    if (cur) clearInterval(cur);
    set({ _pollTimer: null, currentBatch: batch });
  },

  updateSettings: async (partial) => {
    set((s) => ({
      settings: s.settings
        ? { ...s.settings, ...partial }
        : (partial as SettingsResponse),
    }));
  },

  pickLocalDir: async () => {
    const w = window as unknown as { showDirectoryPicker?: () => Promise<{ name: string }> };
    if (!w.showDirectoryPicker) {
      throw new Error('当前浏览器不支持选择本机文件夹');
    }
    const handle = await w.showDirectoryPicker();
    const name = handle.name;
    try {
      localStorage.setItem('mixer.localDirName', name);
    } catch {
      // ignore
    }
    set((s) => ({ form: { ...s.form, localDirName: name } }));
  },

  clearLocalDir: () => {
    try {
      localStorage.removeItem('mixer.localDirName');
    } catch {
      // ignore
    }
    set((s) => ({ form: { ...s.form, localDirName: undefined } }));
  },
}));
