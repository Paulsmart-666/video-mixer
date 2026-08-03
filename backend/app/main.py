import asyncio
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import config_store
from .routers import compose, files, library, settings
from .services.encoder_profile import detect_encoder_profile

encoder_profile = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global encoder_profile
    encoder_profile = detect_encoder_profile()
    print(f"[encoder] detected: {encoder_profile.name}")
    print(f"[settings] material_root={config_store.settings.material_root}")
    print(f"[settings] output_dir={config_store.settings.output_dir}")
    yield


app = FastAPI(title="视频混剪工具", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(library.router)
app.include_router(compose.router)
app.include_router(files.router)


dist_path = Path("/workspace/frontend/dist")
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")
