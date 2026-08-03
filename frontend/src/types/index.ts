// 与后端 app/models 对齐的 TS 类型与常量
// 路径别名 @/types -> src/types

export type FrameworkType = 'framework_4' | 'framework_3';

// 框架对应的分类顺序（中文分类名，与后端 Category 枚举值一致）
export const FRAMEWORK_SEQUENCE: Record<FrameworkType, string[]> = {
  framework_4: ['前贴', '口播开头', '口播中间', '口播结尾'],
  framework_3: ['口播开头', '口播中间', '口播结尾'],
};

export const FRAMEWORK_LABELS: Record<FrameworkType, string> = {
  framework_4: '前贴 + 口播开头 + 口播中间 + 口播结尾（4 段）',
  framework_3: '口播开头 + 口播中间 + 口播结尾（3 段）',
};

export interface DurationOption {
  label: string;
  value: number;
}

// 成片时长限制：0 表示不限，其余为时长上限（秒）
export const DURATION_OPTIONS: DurationOption[] = [
  { label: '不限', value: 0 },
  { label: '30 秒', value: 30 },
  { label: '1 分钟', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '3 分钟', value: 180 },
];

export type Category = string;

export interface MaterialClip {
  id: string;
  name: string;
  rel_path: string;
  abs_path: string;
  category: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  has_audio: boolean;
  size: number;
  video_codec: string;
  pix_fmt: string;
}

export interface CategoryGroup {
  category: string;
  clips: MaterialClip[];
  count: number;
  total_duration: number;
}

export interface LibrarySnapshot {
  root: string;
  scanned_at: string;
  groups: CategoryGroup[];
  missing_categories: string[];
  unknown_folders: string[];
  errors: string[];
  ignored_clips: Record<string, unknown>[];
}

export interface SegmentRef {
  category: string;
  clip_id: string;
  name: string;
  duration: number;
}

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'skipped';

export interface TaskItem {
  id: string;
  index: number;
  filename: string;
  status: TaskStatus;
  segments: SegmentRef[];
  est_duration: number;
  progress: number;
  output_path: string | null;
  download_url: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export type BatchStatus = 'running' | 'completed' | 'cancelled' | 'partial';

export interface BatchState {
  batch_id: string;
  created_at: string;
  request: ComposeRequest;
  tasks: TaskItem[];
  total: number;
  done: number;
  failed: number;
  cancelled: number;
  status: BatchStatus;
  planning_note: string | null;
}

export interface ComposeOptions {
  transition: boolean;
  subtitle: boolean;
  watermark: boolean;
  bgm: boolean;
  voice_normalize: boolean;
  transition_type: string;
  transition_duration: number;
  watermark_text: string;
  bgm_path: string | null;
  bgm_volume: number;
}

export interface ComposeRequest {
  framework: FrameworkType;
  count: number;
  max_duration: number;
  options: ComposeOptions;
  naming_rule: string;
  output_dir: string;
}

export interface SettingsResponse {
  material_root: string;
  output_dir: string;
  concurrency: number;
  encoder_name: string;
  ffmpeg_ok: boolean;
}

export interface BrowseItem {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface BrowseResponse {
  path: string;
  items: BrowseItem[];
}
