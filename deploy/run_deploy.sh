#!/bin/bash
# Run by deploy-launcher.sh once the git checkout is current. Installs this checkout's
# deploy/ files into INSTALL_DIR, without touching .env or bad-images, which exist only on
# the server and are never part of this checkout, then runs the pull deploy once.
set -euo pipefail

INSTALL_DIR="${1:?Usage: run_deploy.sh <install-dir>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

install -d -m 755 "$INSTALL_DIR"
cp -a "$SCRIPT_DIR"/. "$INSTALL_DIR"/

exec python3 "$INSTALL_DIR/pull_deploy.py"
