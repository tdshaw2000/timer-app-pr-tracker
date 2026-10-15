"""Serves the single page and its static files. Parsing and charts all run in the browser."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

STATIC_DIRECTORY = Path(__file__).parent / "static"

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# Without this a browser may keep an old styles.css or app.js for days beside a new index.html
# (they have no version in their names), so a deploy would show a half-old page. "no-cache"
# means check with the server every time; an unchanged file costs only a 304.
REVALIDATE = {"Cache-Control": "no-cache"}


class RevalidatedStaticFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers.update(REVALIDATE)
        return response


@app.api_route("/healthz", methods=["GET", "HEAD"])
def healthz():
    return {"status": "ok"}


@app.get("/")
def home():
    return FileResponse(STATIC_DIRECTORY / "index.html", headers=REVALIDATE)


app.mount("/static", RevalidatedStaticFiles(directory=STATIC_DIRECTORY), name="static")
