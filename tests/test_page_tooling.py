"""The page draws its charts with a vendored copy of Chart.js and is tested in a real browser
(Playwright). These tests pin down the files that no test can run itself."""

import json
import re
import tomllib
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "timer_app_pr_tracker/static/vendor"


def test_chart_js_is_vendored_at_the_version_package_json_pins():
    pinned = json.loads((ROOT / "package.json").read_text())["devDependencies"]["chart.js"]
    banner = (VENDOR / "chart.umd.js").read_text()[:300]

    assert re.fullmatch(r"\d+\.\d+\.\d+", pinned), "pin an exact version, not a range"
    assert f"Chart.js v{pinned}" in banner


def test_the_chart_js_licence_travels_with_the_vendored_copy():
    assert "MIT License" in (VENDOR / "LICENSE.md").read_text()


def test_playwright_is_a_dev_dependency():
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text())

    assert any(d.startswith("playwright") for d in pyproject["dependency-groups"]["dev"])


def test_ci_installs_the_browser_before_running_the_tests():
    workflow = yaml.safe_load((ROOT / ".github/workflows/ci.yml").read_text())
    runs = [step.get("run", "") for step in workflow["jobs"]["test"]["steps"]]
    install = next(i for i, run in enumerate(runs) if "playwright install" in run)
    pytest = next(i for i, run in enumerate(runs) if "uv run pytest" in run)

    assert "chromium" in runs[install]
    assert install < pytest
