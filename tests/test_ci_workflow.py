"""The GitHub Actions workflow can't run here, so these tests pin down what it must do.
The real proof is CI going green on a pull request."""

from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def workflow():
    return yaml.safe_load((ROOT / ".github/workflows/ci.yml").read_text())


def triggers(workflow):
    # YAML 1.1 reads the bare key `on` as the boolean True.
    return workflow.get("on", workflow.get(True))


def commands(job):
    return "\n".join(step.get("run", "") for step in job["steps"])


def test_ci_runs_on_every_pull_request_and_on_pushes_to_main(workflow):
    on = triggers(workflow)

    assert "pull_request" in on
    assert on["push"]["branches"] == ["main"]


def test_ci_lints_and_runs_every_test(workflow):
    run = commands(workflow["jobs"]["test"])

    assert "uv sync --frozen" in run
    assert "ruff check" in run and "ruff format --check" in run
    assert "uv run pytest\n" in run + "\n"
