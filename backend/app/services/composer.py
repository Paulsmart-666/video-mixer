import os
import re
import shutil
import subprocess
import threading
from pathlib import Path
from typing import List

from ..models import ComposeRequest, MaterialClip, TaskItem, TaskStatus
from .ffmpeg_builder import build_concat_demuxer_cmd, build_filter_complex_cmd


def _all_same_codec_params(clips: List[MaterialClip]) -> bool:
    if not clips:
        return False
    first = clips[0]
    for clip in clips[1:]:
        if (
            clip.width != first.width
            or clip.height != first.height
            or abs(clip.fps - first.fps) > 0.01
            or clip.has_audio != first.has_audio
            or clip.video_codec != first.video_codec
            or clip.pix_fmt != first.pix_fmt
        ):
            return False
    return True


class Composer:
    def run(
        self,
        task: TaskItem,
        request: ComposeRequest,
        clips: List[MaterialClip],
        cancel_event: threading.Event,
        on_progress: callable,
    ) -> None:
        output_path = Path(task.output_path)
        part_path = output_path.with_suffix(".part" + output_path.suffix)
        part_path.parent.mkdir(parents=True, exist_ok=True)

        opts = request.options
        # 一律走 filter_complex 重新编码归一化，规避流拷贝拼接不同编码/参数
        # 导致的成片损坏（后半段无法播放、时长元数据错乱）问题。
        use_filter = True

        temp_files: List[Path] = []
        try:
            if use_filter:
                cmd, temp_files = build_filter_complex_cmd(
                    clips,
                    str(part_path),
                    enable_transition=opts.transition,
                    transition_type=opts.transition_type,
                    transition_duration=opts.transition_duration,
                    enable_subtitle=opts.subtitle,
                    enable_watermark=opts.watermark,
                    watermark_text=opts.watermark_text,
                    enable_bgm=opts.bgm,
                    bgm_path=opts.bgm_path,
                    bgm_volume=opts.bgm_volume,
                    enable_voice_normalize=opts.voice_normalize,
                )
            else:
                cmd, list_path = build_concat_demuxer_cmd(clips, str(part_path))
                temp_files = [list_path]

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )

            # 并发排空 stderr，避免长编码时管道缓冲被写满导致 ffmpeg 阻塞（死锁）。
            # stdout 在同一线程里逐行读进度；stderr 交给守护线程读，两端同时流动。
            stderr_buf: List[str] = []

            def _drain_stderr() -> None:
                if proc.stderr:
                    stderr_buf.append(proc.stderr.read())

            stderr_thread = threading.Thread(target=_drain_stderr, daemon=True)
            stderr_thread.start()

            est_duration = max(task.est_duration, 0.1)

            if proc.stdout:
                for line in proc.stdout:
                    if cancel_event.is_set():
                        proc.terminate()
                        break
                    line = line.strip()
                    m = re.match(r"out_time_us=(\d+)", line)
                    if m:
                        us = int(m.group(1))
                        progress = min(0.99, us / 1_000_000 / est_duration)
                        on_progress(progress)
                    elif line.startswith("progress=end"):
                        on_progress(1.0)

            stderr_thread.join()
            stderr_text = "".join(stderr_buf)
            returncode = proc.wait()

            if cancel_event.is_set():
                task.status = TaskStatus.CANCELLED
                if part_path.exists():
                    part_path.unlink()
                return

            if returncode != 0:
                err = stderr_text[-3000:] or f"ffmpeg 返回非零退出码 {returncode}"
                task.status = TaskStatus.FAILED
                task.error = err
                if part_path.exists():
                    part_path.unlink()
                return

            os.replace(str(part_path), str(output_path))
            task.status = TaskStatus.DONE
            task.progress = 1.0
            task.output_path = str(output_path.resolve())
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            if part_path.exists():
                part_path.unlink()
        finally:
            for f in temp_files:
                try:
                    f.unlink()
                except FileNotFoundError:
                    pass
