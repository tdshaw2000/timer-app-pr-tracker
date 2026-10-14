"""CLAUDE.md is read by every Claude session on this repo. These tests pin the rules the owner
asked for, so they can't quietly drop out."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def claude_md():
    return (ROOT / "CLAUDE.md").read_text()


def test_claude_md_requires_strict_tdd_with_red_and_green_commits():
    text = claude_md()

    assert "strict TDD" in text
    assert "red" in text and "green" in text


def test_claude_md_says_prs_open_as_drafts():
    assert "draft" in claude_md()
