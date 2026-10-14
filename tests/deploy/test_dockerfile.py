"""The image the VM runs (see docs/runbook.md)."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / "Dockerfile"
REPOSITORY_URL = "https://github.com/tdshaw2000/timer-app-pr-tracker"


def _instructions():
    """(INSTRUCTION, arguments) pairs, with continuation lines joined and comments dropped."""
    text = re.sub(r"\\\n", " ", DOCKERFILE.read_text())
    pairs = []
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            keyword, _, arguments = line.partition(" ")
            pairs.append((keyword.upper(), arguments.strip()))
    return pairs


def _copies():
    return [arguments.split() for keyword, arguments in _instructions() if keyword == "COPY"]


def test_the_image_installs_only_the_locked_runtime_dependencies():
    runs = [arguments for keyword, arguments in _instructions() if keyword == "RUN"]
    assert any("uv sync --frozen --no-dev" in run for run in runs)


def test_the_app_package_is_copied_into_the_image():
    sources = {copy[0].rstrip("/") for copy in _copies()}
    assert "timer_app_pr_tracker" in sources


def test_the_image_runs_as_a_non_root_user():
    instructions = _instructions()
    users = [i for i, (keyword, _) in enumerate(instructions) if keyword == "USER"]
    assert users, "no USER instruction"
    user = instructions[users[-1]][1].split(":")[0]
    assert user.isdigit() and int(user) != 0
    last_run = max(i for i, (keyword, _) in enumerate(instructions) if keyword == "RUN")
    assert users[-1] > last_run


def test_the_image_serves_the_app_on_port_8000():
    assert ("EXPOSE", "8000") in _instructions()
    command = json.loads(next(a for keyword, a in _instructions() if keyword == "CMD"))
    assert command[:2] == ["uvicorn", "timer_app_pr_tracker.web:app"]
    assert command[command.index("--port") + 1] == "8000"


def test_the_image_checks_its_own_health():
    healthchecks = [arguments for keyword, arguments in _instructions() if keyword == "HEALTHCHECK"]
    assert len(healthchecks) == 1
    assert "http://127.0.0.1:8000/healthz" in healthchecks[0]


def test_the_image_names_its_source_repository():
    labels = " ".join(arguments for keyword, arguments in _instructions() if keyword == "LABEL")
    assert f"org.opencontainers.image.source={REPOSITORY_URL}" in labels


def test_the_image_carries_the_deploy_files_for_installing_on_the_vm():
    assert ["deploy", "/opt/timer-app-pr-tracker/deploy"] in _copies()


def test_the_build_context_leaves_out_tests_caches_and_the_virtualenv():
    patterns = (ROOT / ".dockerignore").read_text().split()
    for pattern in (".git", ".venv", "tests", "**/__pycache__", "**/*.py[cod]"):
        assert pattern in patterns, pattern
