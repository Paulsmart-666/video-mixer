import itertools
import random
from dataclasses import dataclass
from typing import Optional

from ..models import Category, FrameworkType, FRAMEWORK_SEQUENCE, LibrarySnapshot, MaterialClip


@dataclass(frozen=True)
class Combination:
    clip_ids: tuple[str, ...]
    total_duration: float
    clips: tuple[MaterialClip, ...]


def plan_combinations(
    snapshot: LibrarySnapshot,
    framework: FrameworkType,
    count: int,
    max_duration: float = 0,
    seed: Optional[int] = None,
) -> tuple[list[Combination], Optional[str]]:
    seq = FRAMEWORK_SEQUENCE[framework]
    pools_map = {g.category: g.clips for g in snapshot.groups}
    pools = [pools_map.get(c, []) for c in seq]

    for cat, pool in zip(seq, pools):
        if not pool:
            raise ValueError(f"缺少素材分类: {cat.value}")

    if seed is not None:
        random.seed(seed)

    space = 1
    for pool in pools:
        space *= len(pool)

    if max_duration and max_duration > 0:
        min_possible = sum(min(c.duration for c in pool) for pool in pools)
        if min_possible > max_duration:
            raise ValueError(
                f"最短组合时长 {min_possible:.1f}s 已超过上限 {max_duration:.1f}s，无法生成"
            )

    picked: list[Combination] = []
    note: Optional[str] = None

    if space <= 20_000:
        all_combos = list(itertools.product(*pools))
        valid = []
        for combo in all_combos:
            total = sum(c.duration for c in combo)
            if not max_duration or total <= max_duration:
                valid.append(Combination(
                    clip_ids=tuple(c.id for c in combo),
                    total_duration=total,
                    clips=combo,
                ))
        random.shuffle(valid)
        picked = valid[:count]
    else:
        seen: set[tuple[str, ...]] = set()
        max_attempts = max(count * 60, 3000)
        attempts = 0
        while len(picked) < count and attempts < max_attempts:
            attempts += 1
            combo = tuple(random.choice(pool) for pool in pools)
            key = tuple(c.id for c in combo)
            if key in seen:
                continue
            total = sum(c.duration for c in combo)
            if max_duration and total > max_duration:
                continue
            seen.add(key)
            picked.append(Combination(
                clip_ids=key,
                total_duration=total,
                clips=combo,
            ))

    if len(picked) < count:
        note = f"仅生成 {len(picked)}/{count} 条：满足时长限制的不重复组合已耗尽"

    return picked, note
