"""deploy/compose.yaml: the web app on the VM it shares with the scramble and WCA apps."""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = ROOT / "deploy" / "compose.yaml"
IMAGE = "ghcr.io/tdshaw2000/timer-app-pr-tracker"
ALIAS = "timer-app-pr-tracker"


def _compose():
    return yaml.safe_load(COMPOSE.read_text())


def _web():
    return _compose()["services"]["web"]


def _bytes(size):
    number, unit = re.fullmatch(r"(\d+)([kmg])", str(size).lower()).groups()
    return int(number) * 1024 ** "kmg".index(unit) * 1024


def test_the_project_has_its_own_name_so_it_never_touches_another_stack():
    assert _compose()["name"] == "timer-app-pr-tracker"


def test_web_is_the_only_service_and_runs_the_image_the_pull_deploy_pins():
    assert list(_compose()["services"]) == ["web"]
    assert _web()["image"] == f"${{TIMER_IMAGE:-{IMAGE}:main}}"


def test_the_app_keeps_no_data_so_it_mounts_nothing():
    web = _web()
    assert "volumes" not in web
    assert "env_file" not in web


def test_the_web_app_publishes_no_port_on_the_host():
    web = _web()
    assert "ports" not in web
    assert web.get("network_mode") is None


def test_the_web_app_is_reached_by_the_edge_caddy_over_its_network():
    assert _web()["networks"] == {"edge": {"aliases": [ALIAS]}}
    edge = _compose()["networks"]["edge"]
    assert edge["external"] is True
    assert edge["name"] == "${EDGE_NETWORK:-scramble-challenge-edge}"


def test_the_web_app_restarts_and_has_a_read_only_root_filesystem():
    web = _web()
    assert web["restart"] == "unless-stopped"
    assert web["read_only"] is True
    assert "/tmp" in web["tmpfs"]


def test_the_web_app_has_a_small_memory_limit_and_rotated_logs():
    web = _web()
    assert _bytes(web["mem_limit"]) <= _bytes("128m")
    assert web["logging"]["driver"] == "json-file"
    assert "max-size" in web["logging"]["options"]
    assert "max-file" in web["logging"]["options"]
