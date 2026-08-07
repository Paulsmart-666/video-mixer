// 后端 API 客户端
// 端点在 backend/app/routers 下：/api/library /api/compose /api/files /api/settings
import type {
  BatchState,
  BrowseResponse,
  ComposeRequest,
  LibrarySnapshot,
  MaterialClip,
  SettingsResponse,
} from '@/types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  // FormData 需要浏览器自动设置 multipart 边界，不能手动指定 Content-Type
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    // 先以 text 读取，避免 res.json() 失败后再读 res.text() 报 body stream already read
    const text = await res.text();
    let detail = text;
    try {
      const data = JSON.parse(text);
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data);
    } catch {
      // 保留原始文本作为错误信息
    }
    throw new Error(detail || `请求失败 (${res.status})`);
  }
  return (await res.json()) as T;
}

export function getSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/settings');
}

export function updateSettings(payload: {
  material_root?: string;
  output_dir?: string;
  concurrency?: number;
}): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getLibrary(): Promise<LibrarySnapshot> {
  return request<LibrarySnapshot>('/api/library');
}

export function refreshLibrary(): Promise<LibrarySnapshot> {
  return request<LibrarySnapshot>('/api/library/refresh', { method: 'POST' });
}

export function deleteClip(clip_id: string): Promise<{ ok: boolean; id: string }> {
  const qs = new URLSearchParams({ clip_id });
  return request(`/api/library/clip?${qs.toString()}`, { method: 'DELETE' });
}

export function deleteClips(clip_ids: string[]): Promise<{
  ok: boolean;
  deleted: string[];
  not_found: string[];
  failed?: { id: string; path: string; reason: string }[];
}> {
  return request('/api/library/clips', {
    method: 'DELETE',
    body: JSON.stringify({ clip_ids }),
  });
}

export function uploadClip(category: string, file: File): Promise<MaterialClip> {
  const form = new FormData();
  form.append('category', category);
  form.append('file', file);
  // 注意：FormData 不能手动设 Content-Type，由浏览器自动带 multipart 边界
  return request<MaterialClip>('/api/library/upload', { method: 'POST', body: form });
}

export function createCompose(req: ComposeRequest): Promise<BatchState> {
  return request<BatchState>('/api/compose', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function getBatch(batch_id: string): Promise<BatchState> {
  return request<BatchState>(`/api/compose/batches/${batch_id}`);
}

export function cancelBatch(batch_id: string): Promise<BatchState> {
  return request<BatchState>(`/api/compose/batches/${batch_id}/cancel`, { method: 'POST' });
}

export function browseFiles(path: string, root: string = ''): Promise<BrowseResponse> {
  const qs = new URLSearchParams({ path });
  if (root) qs.set('root', root);
  return request<BrowseResponse>(`/api/files/browse?${qs.toString()}`);
}

export function uploadBgm(file: File): Promise<{ path: string }> {
  const form = new FormData();
  form.append('file', file);
  // FormData 由浏览器自动设置 multipart 边界，不能手动指定 Content-Type
  return request<{ path: string }>('/api/files/upload-bgm', { method: 'POST', body: form });
}

// 拼接成片下载链接（后端 /api/files/download?path=...）
export function downloadUrl(path: string | null): string {
  const qs = new URLSearchParams({ path: path ?? '' });
  return `/api/files/download?${qs.toString()}`;
}
