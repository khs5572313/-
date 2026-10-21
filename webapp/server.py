"""판독 웹앱 (로컬 실행용).

  uvicorn webapp.server:app --port 8000
  → http://127.0.0.1:8000
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from docread import config
from docread.pipeline import Options, load, restructure, run, save
from docread.profiles import PROFILES

JOBS_DIR = os.path.join(config.DATA_DIR, "jobs")
STATIC = os.path.join(os.path.dirname(__file__), "static")
JOB_ID_RE = re.compile(r"^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$")
MAX_UPLOAD_BYTES = 200 * 1024 * 1024

os.makedirs(JOBS_DIR, exist_ok=True)
app = FastAPI(title="docread")
executor = ThreadPoolExecutor(max_workers=2)
_lock = threading.Lock()


# ---------- 작업 상태 ----------

def _job_dir(job_id: str) -> str:
    if not JOB_ID_RE.match(job_id):
        raise HTTPException(404, "잘못된 작업 ID")
    d = os.path.join(JOBS_DIR, job_id)
    if not os.path.isdir(d):
        raise HTTPException(404, "작업을 찾을 수 없음")
    return d


def _read_status(d: str) -> dict:
    with open(os.path.join(d, "status.json"), encoding="utf-8") as f:
        return json.load(f)


def _write_status(d: str, **upd) -> None:
    with _lock:
        path = os.path.join(d, "status.json")
        st = _read_status(d) if os.path.exists(path) else {}
        msg = upd.pop("message", None)
        st.update(upd)
        if msg:
            st.setdefault("log", []).append(f"{time.strftime('%H:%M:%S')} {msg}")
            st["message"] = msg
        with open(path + ".tmp", "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(path + ".tmp", path)


def _run_job(d: str, inputs: list[str], opts: Options) -> None:
    _write_status(d, state="running", message="판독 시작")
    try:
        run(inputs, d, opts, progress=lambda m: _write_status(d, message=m))
        _write_status(d, state="done", message="완료")
    except Exception as e:
        _write_status(d, state="error", message=f"실패: {type(e).__name__}: {e}")


def _run_restructure(d: str) -> None:
    _write_status(d, state="running", message="구조화·검증 재실행")
    try:
        restructure(d, progress=lambda m: _write_status(d, message=m))
        _write_status(d, state="done", message="완료")
    except Exception as e:
        _write_status(d, state="error", message=f"실패: {type(e).__name__}: {e}")


# ---------- API ----------

@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC, "index.html"))


@app.get("/api/profiles")
def profiles():
    return [{"key": k, "label": p.label} for k, p in PROFILES.items()]


@app.post("/api/jobs")
async def create_job(files: list[UploadFile] = File(...), profile: str = Form("saenggibu"),
                     passes: int = Form(2), force_ocr: bool = Form(False), title: str = Form("")):
    if profile not in PROFILES:
        raise HTTPException(400, "알 수 없는 프로파일")
    job_id = f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    d = os.path.join(JOBS_DIR, job_id)
    os.makedirs(os.path.join(d, "input"))
    inputs, total = [], 0
    for i, uf in enumerate(files):
        name = re.sub(r"[^\w.\-가-힣]", "_", os.path.basename(uf.filename or f"file{i}"))
        path = os.path.join(d, "input", f"{i:02d}_{name}")
        data = await uf.read()
        total += len(data)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "업로드 용량 초과(200MB)")
        with open(path, "wb") as f:
            f.write(data)
        inputs.append(path)
    opts = Options(profile=profile, passes=2 if passes >= 2 else 1, force_ocr=force_ocr)
    _write_status(d, id=job_id, title=title or os.path.basename(files[0].filename or job_id),
                  profile=profile, passes=opts.passes, created=time.time(), state="queued", message="대기 중")
    executor.submit(_run_job, d, inputs, opts)
    return {"id": job_id}


@app.get("/api/jobs")
def list_jobs():
    out = []
    for name in sorted(os.listdir(JOBS_DIR), reverse=True):
        d = os.path.join(JOBS_DIR, name)
        if os.path.exists(os.path.join(d, "status.json")):
            st = _read_status(d)
            st.pop("log", None)
            out.append(st)
    return out


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    d = _job_dir(job_id)
    st = _read_status(d)
    res = load(d) if os.path.exists(os.path.join(d, "result.json")) else None
    return {"status": st, "result": res}


class TranscriptEdit(BaseModel):
    transcript: str


@app.put("/api/jobs/{job_id}/pages/{page}")
def edit_page(job_id: str, page: int, body: TranscriptEdit):
    d = _job_dir(job_id)
    with _lock:
        res = load(d)
        if not 1 <= page <= len(res["pages"]):
            raise HTTPException(404, "페이지 없음")
        p = res["pages"][page - 1]
        p["transcript"] = body.transcript
        p["edited"] = True
        save(res, d)
    return {"ok": True}


@app.post("/api/jobs/{job_id}/restructure")
def rerun_structure(job_id: str):
    d = _job_dir(job_id)
    if _read_status(d).get("state") in ("queued", "running"):
        raise HTTPException(409, "이미 처리 중")
    executor.submit(_run_restructure, d)
    return {"ok": True}


@app.get("/api/jobs/{job_id}/file/{path:path}")
def job_file(job_id: str, path: str):
    d = os.path.realpath(_job_dir(job_id))
    full = os.path.realpath(os.path.join(d, path))
    if not full.startswith(d + os.sep) or not os.path.isfile(full) or "/input/" in full[len(d):] + "/":
        raise HTTPException(404, "파일 없음")
    return FileResponse(full, filename=os.path.basename(full) if not full.endswith(".png") else None)
