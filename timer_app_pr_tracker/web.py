"""Serves the single page and its static files. Parsing and charts all run in the browser."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

STATIC_DIRECTORY = Path(__file__).parent / "static"

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/")
def home():
    return FileResponse(STATIC_DIRECTORY / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIRECTORY), name="static")
