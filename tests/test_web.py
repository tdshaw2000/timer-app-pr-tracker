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


def test_healthz_answers_head_probes_with_200_and_no_body(client):
    # Uptime monitors such as UptimeRobot probe with HEAD by default.
    response = client.head("/healthz")

    assert response.status_code == 200
    assert response.content == b""


def test_healthz_accepts_only_get_and_head(client):
    response = client.post("/healthz")

    assert response.status_code == 405


@pytest.mark.parametrize(
    "path", ["/", "/static/styles.css", "/static/js/app.js", "/static/themes/dos/theme.css"]
)
def test_pages_and_static_files_are_revalidated_so_a_deploy_never_mixes_old_and_new(client, path):
    response = client.get(path)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["etag"]


def test_a_revalidating_browser_gets_a_cheap_304_for_an_unchanged_file(client):
    etag = client.get("/static/styles.css").headers["etag"]

    response = client.get("/static/styles.css", headers={"If-None-Match": etag})

    assert response.status_code == 304
