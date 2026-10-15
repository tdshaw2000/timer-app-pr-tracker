"""Starts the real app on a free port and drives it in a real browser."""

import glob
import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


def find_chromium():
    """CI installs the browser Playwright expects. Where Playwright's own browser is missing but
    another Chromium sits in PLAYWRIGHT_BROWSERS_PATH (as in the Claude cloud sandbox), use that."""
    explicit = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if explicit:
        return explicit
    browsers = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
    if browsers:
        found = sorted(glob.glob(f"{browsers}/chromium-*/chrome-linux/chrome"))
        return found[-1] if found else None
    return None


@pytest.fixture(scope="session")
def base_url():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "timer_app_pr_tracker.web:app", "--port", str(port)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(f"{url}/healthz", timeout=1)
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("the app did not start")
        yield url
    finally:
        server.terminate()
        server.wait(timeout=10)


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as playwright:
        chromium = playwright.chromium.launch(
            executable_path=find_chromium(), args=["--no-sandbox"]
        )
        yield chromium
        chromium.close()


@pytest.fixture
def page(browser, base_url):
    context = browser.new_context()
    context.set_default_timeout(5000)
    page = context.new_page()
    page.base_url = base_url
    yield page
    context.close()
