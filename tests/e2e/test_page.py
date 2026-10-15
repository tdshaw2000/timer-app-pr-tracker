"""The page, end to end: upload a file, read the charts. The export below is invented."""

import json

HEADER = '"Puzzle";"Category";"Time(millis)";"Date(millis)";"Scramble";"Penalty";"Comment"'
START = 1_766_653_366_000


def row(puzzle, category, time_ms, index, penalty="0"):
    fields = [puzzle, category, time_ms, START + index * 1000, "R U", penalty, ""]
    return ";".join(f'"{field}"' for field in fields)


def export(*extra):
    rows = [
        *(row("333", "Normal", t, i) for i, t in enumerate([10000, 9000, 9500, 8000, 8500, 8200])),
        *(row("222", "Normal", t, 10 + i) for i, t in enumerate([4000, 3500, 3600])),
        *(row("333", "3x3 on 4x4", t, 20 + i) for i, t in enumerate([80000, 75000])),
        *extra,
    ]
    return "\n".join([HEADER, *rows]).encode()


def upload(page, content):
    page.goto(page.base_url)
    page.set_input_files(
        "#file", {"name": "export.txt", "mimeType": "text/plain", "buffer": content}
    )


def chart_points(page):
    """The record points of every chart on the page, in order, keyed by its caption label."""
    return page.evaluate(
        """() => [...document.querySelectorAll('#charts canvas')].map((canvas) => ({
            label: Chart.getChart(canvas).data.datasets[0].label,
            points: Chart.getChart(canvas).data.datasets[0].data,
        }))"""
    )


def test_uploading_a_file_shows_a_chart_of_records_for_each_average(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    lines = chart_points(page)

    assert [line["label"] for line in lines] == ["Single", "Ao5"]
    assert [p["x"] for p in lines[0]["points"]] == [1, 2, 4]
    assert [p["y"] for p in lines[0]["points"]] == [10, 9, 8]
    assert [p["x"] for p in lines[1]["points"]] == [5, 6]
    captions = page.locator("#charts figcaption").all_inner_texts()
    assert "8.00" in captions[0]
    assert "8.56" in captions[1]


def test_each_puzzle_and_category_has_its_own_entry_and_its_own_charts(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    options = page.locator("#puzzle option").all_inner_texts()
    assert options == ["3x3 (6 solves)", "2x2 (3 solves)", "3x3 · 3x3 on 4x4 (2 solves)"]

    page.select_option("#puzzle", label="2x2 (3 solves)")
    assert [p["y"] for p in chart_points(page)[0]["points"]] == [4, 3.5]

    page.select_option("#puzzle", label="3x3 · 3x3 on 4x4 (2 solves)")
    assert [p["y"] for p in chart_points(page)[0]["points"]] == [80, 75]


def test_the_axis_can_switch_from_solve_number_to_date(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    page.get_by_label("Date").check()

    assert [p["x"] for p in chart_points(page)[0]["points"]] == [
        START,
        START + 1000,
        START + 3000,
    ]
    page.get_by_label("Solve number").check()
    assert [p["x"] for p in chart_points(page)[0]["points"]] == [1, 2, 4]


def test_rows_that_were_left_out_are_listed_as_plain_text(page):
    bad = '"333";"Normal";"9000";"1766653999000";"R";"<b>oops</b>";""'
    upload(page, export(bad))
    page.wait_for_selector("#results:not([hidden])")

    skipped = page.locator("#skipped")

    assert "1 row was left out: line 13" in skipped.inner_text()
    assert "<b>oops</b>" in skipped.inner_text()
    assert skipped.locator("b").count() == 0


def test_a_file_that_is_not_an_export_gets_a_message_and_no_charts(page):
    upload(page, b"hello")

    page.wait_for_function("document.querySelector('#status').textContent.includes('Cubic Timer')")

    assert page.locator("#results").is_hidden()


def test_the_file_never_leaves_the_browser(page):
    requests = []
    page.on("request", lambda request: requests.append((request.method, request.url)))

    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    assert {method for method, _ in requests} == {"GET"}
    assert all(url.startswith(page.base_url) for _, url in requests), json.dumps(requests)


def test_the_page_loads_and_charts_with_no_failed_requests_or_script_errors(page):
    failures = []
    page.on(
        "response",
        lambda response: failures.append(response.url) if response.status >= 400 else None,
    )
    page.on("pageerror", lambda error: failures.append(str(error)))
    page.on(
        "console",
        lambda message: failures.append(message.text) if message.type == "error" else None,
    )

    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")
    page.wait_for_load_state("networkidle")

    assert failures == []
