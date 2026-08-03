from enum import Enum


class Category(str, Enum):
    PRE_ROLL = "前贴"
    OPENING = "口播开头"
    MIDDLE = "口播中间"
    ENDING = "口播结尾"


class FrameworkType(str, Enum):
    F4 = "framework_4"
    F3 = "framework_3"


FRAMEWORK_SEQUENCE = {
    FrameworkType.F4: [Category.PRE_ROLL, Category.OPENING, Category.MIDDLE, Category.ENDING],
    FrameworkType.F3: [Category.OPENING, Category.MIDDLE, Category.ENDING],
}


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"
