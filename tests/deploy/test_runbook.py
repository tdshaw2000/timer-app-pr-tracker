"""docs/runbook.md: the one-time VM setup. These tests keep it in step with the files it names."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAUNCHER = (ROOT / "deploy" / "deploy-launcher.sh").read_text()


def _runbook():
    return (ROOT / "docs" / "runbook.md").read_text()


def test_it_names_the_hostname_the_caddy_site_block_serves():
    site = (ROOT / "deploy" / "caddy" / "timer-pr-tracker.caddy").read_text()
    hostname = re.search(r"^(\S+) \{$", site, re.MULTILINE).group(1)
    assert hostname in _runbook()


def test_it_uses_the_checkout_and_install_directories_the_launcher_uses():
    checkout = re.search(r'CHECKOUT_DIR="(.+)"', LAUNCHER).group(1).replace("$HOME", "~")
    install = re.search(r'INSTALL_DIR="(.+)"', LAUNCHER).group(1)
    assert checkout in _runbook()
    assert install in _runbook()


def test_it_restricts_the_deploy_key_to_the_launcher_and_names_both_secrets():
    assert 'command=\\"$HOME/apps/timer-app-pr-tracker/deploy-launcher.sh\\"' in _runbook()
    assert "DEPLOY_HOST" in _runbook() and "DEPLOY_SSH_KEY" in _runbook()


def test_it_makes_the_first_image_public_so_the_vm_needs_no_credentials():
    assert "Change visibility" in _runbook()
    assert "ghcr.io/tdshaw2000/timer-app-pr-tracker:main" in _runbook()


def test_it_routes_the_hostname_through_the_shared_edge_caddy():
    assert "TIMER_SITE_ADDRESS" in _runbook()
    assert "caddy reload" in _runbook()
    assert "scramble-challenge" in _runbook()


def test_it_covers_the_everyday_operations():
    for heading in ("One-time setup", "Everyday operations", "Rolling back by hand"):
        assert f"## {heading}" in _runbook()


def test_the_pr_is_merged_before_the_vm_clones_the_launcher_out_of_main():
    # deploy-launcher.sh only exists on main once the PR that adds it has been merged.
    runbook = _runbook()
    assert runbook.index("Merge the PR") < runbook.index("git clone")
