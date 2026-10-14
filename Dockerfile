FROM python:3.12-slim

LABEL org.opencontainers.image.source=https://github.com/tdshaw2000/timer-app-pr-tracker

RUN pip install --no-cache-dir "uv>=0.8,<0.10"

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY timer_app_pr_tracker timer_app_pr_tracker

# The Compose project and deploy scripts, so the VM can copy them out of the image
# (docs/runbook.md) instead of needing a checkout of the repository.
COPY deploy /opt/timer-app-pr-tracker/deploy

USER 10001:10001

EXPOSE 8000

# The pull deploy (deploy/pull_deploy.py) waits for this before keeping a new image.
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4)"]

CMD ["uvicorn", "timer_app_pr_tracker.web:app", "--host", "0.0.0.0", "--port", "8000"]
