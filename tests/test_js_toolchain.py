"""The JavaScript half of the app (parsing and statistics run in the browser) is tested with
Vitest. These tests pin down the toolchain files, which no test can run itself."""

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def package():
    return json.loads((ROOT / "package.json").read_text())


def test_npm_test_runs_vitest_once():
    assert package()["scripts"]["test"] == "vitest run"


def test_vitest_is_a_pinned_dev_dependency_with_a_lockfile():
    version = package()["devDependencies"]["vitest"]

    assert re.fullmatch(r"\d+\.\d+\.\d+", version), "pin an exact version, not a range"
    assert (ROOT / "package-lock.json").is_file()


def test_the_app_is_plain_es_modules_with_no_build_step():
    assert package()["type"] == "module"
    assert "build" not in package().get("scripts", {})


def test_node_modules_stay_out_of_git_and_the_image_context():
    assert "node_modules/" in (ROOT / ".gitignore").read_text().splitlines()
    assert "node_modules" in (ROOT / ".dockerignore").read_text().splitlines()


def test_ci_installs_node_and_runs_the_js_tests():
    workflow = yaml.safe_load((ROOT / ".github/workflows/ci.yml").read_text())
    steps = workflow["jobs"]["test"]["steps"]
    run = "\n".join(step.get("run", "") for step in steps)

    assert any(step.get("uses", "").startswith("actions/setup-node@") for step in steps)
    assert "npm ci" in run
    assert "npm test" in run
