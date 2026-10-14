"""The web app only hands out the page and its health check; solves never reach the server."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from timer_app_pr_tracker.web import app

    return TestClient(app)


def test_healthz_says_ok_without_touching_anything_else(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_the_home_page_is_html_with_the_app_name(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>Timer App PR Tracker</title>" in response.text


def test_static_files_are_served(client):
    response = client.get("/static/styles.css")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/css")


def test_the_server_accepts_no_uploads(client):
    response = client.post("/", content=b"1.23")

    assert response.status_code == 405
