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


def test_choosing_a_second_file_while_the_first_is_still_being_read_shows_the_second(page):
    page.add_init_script(
        """
        const read = File.prototype.text;
        File.prototype.text = async function () {
            if (this.name === 'slow.txt') await new Promise((done) => setTimeout(done, 1500));
            return read.call(this);
        };
        """
    )
    page.goto(page.base_url)
    page.set_input_files(
        "#file", {"name": "slow.txt", "mimeType": "text/plain", "buffer": export()}
    )
    page.set_input_files(
        "#file",
        {
            "name": "fast.txt",
            "mimeType": "text/plain",
            "buffer": export(row("222", "Normal", 3000, 40)),
        },
    )
    page.wait_for_function("document.querySelector('#status').textContent.includes('fast.txt')")

    page.wait_for_timeout(2500)

    assert page.locator("#status").inner_text() == "Read 12 solves from fast.txt."
    assert page.locator("#puzzle option").all_inner_texts()[1] == "2x2 (4 solves)"


def test_a_puzzle_with_only_DNFs_says_it_has_no_records(page):
    dnfs = [row("skewb", "Normal", 0, 30 + i, penalty="2") for i in range(3)]
    upload(page, export(*dnfs))
    page.wait_for_selector("#results:not([hidden])")

    page.select_option("#puzzle", label="Skewb (3 solves)")

    assert page.locator("#charts").inner_text() == "No records yet for this puzzle."
    assert page.locator("#charts canvas").count() == 0


def test_a_file_with_no_solves_says_so_and_shows_no_results(page):
    upload(page, HEADER.encode())

    page.wait_for_function("document.querySelector('#status').textContent.startsWith('Read')")

    assert page.locator("#status").inner_text() == "Read 0 solves from export.txt."
    assert page.locator("#results").is_hidden()


def test_a_worker_that_fails_gives_a_message_instead_of_reading_forever(page):
    page.route(
        "**/js/worker.js",
        lambda route: route.fulfill(
            content_type="text/javascript",
            body="self.onmessage = () => { throw new Error('boom'); };",
        ),
    )
    upload(page, export())

    page.wait_for_function(
        "document.querySelector('#status').textContent.includes('Something went wrong')"
    )

    assert page.locator("#results").is_hidden()


def cstimer_export():

    def solves(times, start):
        return [[[0, t], "R U", "", start + i] for i, t in enumerate(times)]

    sessions = {
        "session1": solves([10000, 9000, 9500, 8000, 8500, 8200], 1_791_966_000),
        "session2": solves([4000, 3500], 1_791_967_000),
        "properties": {
            "sessionData": json.dumps({"1": {"opt": {}}, "2": {"opt": {"scrType": "222so"}}})
        },
    }
    sessions["session1"].append([[0, "fast"], "R", "", 1_791_966_100])
    return json.dumps(sessions).encode()


def test_a_csTimer_export_is_read_too(page):
    upload(page, cstimer_export())
    page.wait_for_selector("#results:not([hidden])")

    assert page.locator("#status").inner_text() == "Read 8 solves from export.txt."
    assert page.locator("#puzzle option").all_inner_texts() == ["3x3 (6 solves)", "2x2 (2 solves)"]
    assert [p["y"] for p in chart_points(page)[0]["points"]] == [10, 9, 8]
    assert "session 1, solve 7" in page.locator("#skipped").inner_text()


def sessions_export():
    def solves(times, start):
        return [[[0, t], "R U", "", start + i] for i, t in enumerate(times)]

    data = {
        "1": {"name": "Main", "opt": {}},
        "2": {"name": "OH", "opt": {"scrType": "333oh"}},
        "3": {"name": "Also main", "opt": {}},
    }
    return json.dumps(
        {
            "session1": solves([10000, 9000], 1_791_966_000),
            "session2": solves([30000, 25000, 26000], 1_791_967_000),
            "session3": solves([8000], 1_791_968_000),
            "properties": {"sessionData": json.dumps(data)},
        }
    ).encode()


def test_csTimer_files_can_be_grouped_by_session_instead_of_puzzle(page):
    upload(page, sessions_export())
    page.wait_for_selector("#results:not([hidden])")

    assert page.locator("#group-puzzle").is_checked()
    assert page.locator("#puzzle option").all_inner_texts() == [
        "3x3 (3 solves)",
        "3x3 · One-handed (3 solves)",
    ]

    page.check("#group-session")
    assert page.locator("#puzzle option").all_inner_texts() == [
        "Main · 3x3 (2 solves)",
        "OH · 3x3 · One-handed (3 solves)",
        "Also main · 3x3 (1 solve)",
    ]
    page.select_option("#puzzle", label="OH · 3x3 · One-handed (3 solves)")
    assert [p["y"] for p in chart_points(page)[0]["points"]] == [30, 25]

    page.check("#group-puzzle")
    assert page.locator("#puzzle option").count() == 2


def test_the_group_by_choice_does_not_apply_to_cubic_timer_files(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    assert page.locator("#group-session").is_disabled()
    assert "csTimer" in page.locator("#group-note").inner_text()
    assert page.locator("#puzzle option").count() == 3


def test_group_by_session_is_available_again_after_loading_a_csTimer_file(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")
    page.set_input_files(
        "#file", {"name": "cs.txt", "mimeType": "text/plain", "buffer": sessions_export()}
    )
    page.wait_for_function(
        "document.querySelector('#status').textContent.includes('Read 6 solves from cs.txt')"
    )

    assert page.locator("#group-session").is_enabled()
    assert page.locator("#group-note").is_hidden()


def test_the_upload_says_both_formats_are_accepted(page):
    page.goto(page.base_url)

    assert "csTimer" in page.locator("label.upload").inner_text()
    assert "Cubic Timer" in page.locator("label.upload").inner_text()


SKIN_LABELS = ["Minimal", "Dark", "DOS", "Mario", "Monkey", "VHS"]


def pick_skin(page, label):
    """Picks a skin and waits until its stylesheet is in and the page has been told."""
    page.evaluate(
        "() => { window.skinLoaded = new Promise("
        "(done) => document.addEventListener('skinchange', done, { once: true })); }"
    )
    page.locator(".skin-picker summary").click()
    page.locator(".skin-option", has_text=label).click()
    page.evaluate("() => window.skinLoaded")


def chart_line_colour(page):
    return page.evaluate(
        "() => Chart.getChart(document.querySelector('canvas')).data.datasets[0].borderColor"
    )


def test_the_gear_menu_lists_the_skins_and_marks_the_current_one(page):
    page.goto(page.base_url)
    page.locator(".skin-picker summary").click()

    assert page.locator(".skin-option").all_inner_texts() == SKIN_LABELS
    assert page.locator('.skin-option[aria-current="true"]').inner_text() == "Minimal"


def test_picking_a_skin_swaps_the_stylesheet_and_survives_a_reload(page):
    page.goto(page.base_url)
    pick_skin(page, "DOS")

    assert page.locator("link#skin-css").get_attribute("href") == "/static/themes/dos/theme.css"
    page.reload()
    assert page.locator("link#skin-css").get_attribute("href") == "/static/themes/dos/theme.css"
    page.locator(".skin-picker summary").click()
    assert page.locator('.skin-option[aria-current="true"]').inner_text() == "DOS"


def test_an_unknown_saved_skin_falls_back_to_minimal(page):
    page.goto(page.base_url)
    page.evaluate("() => localStorage.setItem('timer-pr-skin', 'nope')")
    page.reload()

    assert page.locator("link#skin-css").get_attribute("href") == "/static/themes/plain/theme.css"


def test_each_skin_styles_the_page(page):
    page.goto(page.base_url)
    seen = set()
    # Minimal is already showing, and picking it again loads nothing, so it comes last.
    for label in [*SKIN_LABELS[1:], SKIN_LABELS[0]]:
        pick_skin(page, label)
        seen.add(
            page.evaluate(
                "() => [getComputedStyle(document.body).backgroundImage,"
                " getComputedStyle(document.body).backgroundColor].join()"
            )
        )

    assert len(seen) == len(SKIN_LABELS)


def test_the_charts_follow_the_skin_and_redraw_when_it_changes(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")
    minimal = chart_line_colour(page)

    pick_skin(page, "VHS")
    page.wait_for_function(
        "(old) => Chart.getChart(document.querySelector('canvas'))"
        ".data.datasets[0].borderColor !== old",
        arg=minimal,
    )

    expected = page.evaluate(
        "() => getComputedStyle(document.documentElement).getPropertyValue('--chart-line').trim()"
    )
    assert expected
    assert chart_line_colour(page) == expected
    assert [line["label"] for line in chart_points(page)] == ["Single", "Ao5"]


def test_charts_drawn_after_picking_a_skin_use_its_colours(page):
    page.goto(page.base_url)
    pick_skin(page, "Dark")
    page.set_input_files(
        "#file", {"name": "export.txt", "mimeType": "text/plain", "buffer": export()}
    )
    page.wait_for_selector("#results:not([hidden])")

    expected = page.evaluate(
        "() => getComputedStyle(document.documentElement).getPropertyValue('--chart-line').trim()"
    )
    assert expected
    assert chart_line_colour(page) == expected


def test_chart_text_and_font_follow_the_skin(page):
    page.goto(page.base_url)
    pick_skin(page, "DOS")
    page.set_input_files(
        "#file", {"name": "export.txt", "mimeType": "text/plain", "buffer": export()}
    )
    page.wait_for_selector("#results:not([hidden])")

    drawn = page.evaluate(
        """() => {
            const chart = Chart.getChart(document.querySelector('canvas'));
            const root = getComputedStyle(document.documentElement);
            return {
                tick: chart.scales.x.options.ticks.color,
                text: root.getPropertyValue('--chart-text').trim(),
                family: chart.options.font.family,
                font: getComputedStyle(document.body).fontFamily,
            };
        }"""
    )

    assert drawn["text"]
    assert drawn["tick"] == drawn["text"]
    assert drawn["family"] == drawn["font"]


def test_each_chart_title_sits_above_its_graph(page):
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    boxes = page.evaluate(
        """() => [...document.querySelectorAll('#charts figure')].map((figure) => ({
            title: figure.querySelector('figcaption').getBoundingClientRect().bottom,
            graph: figure.querySelector('canvas').getBoundingClientRect().top,
        }))"""
    )

    assert boxes
    assert all(box["title"] <= box["graph"] for box in boxes)


def test_clicking_the_title_resets_the_page_but_keeps_the_skin(page):
    upload(page, export())
    page.locator("#results").wait_for()
    pick_skin(page, "DOS")

    page.locator("h1 a").click()
    page.wait_for_load_state()

    assert page.url.rstrip("/") == page.base_url.rstrip("/")
    assert page.locator("#results").is_hidden()
    assert page.locator("#charts canvas").count() == 0
    assert page.locator("link#skin-css").get_attribute("href") == "/static/themes/dos/theme.css"


def test_the_title_link_looks_like_the_plain_title(page):
    page.goto(page.base_url)

    style = page.evaluate(
        """() => {
            const link = getComputedStyle(document.querySelector('h1 a'));
            const heading = getComputedStyle(document.querySelector('h1'));
            return { link: [link.color, link.textDecorationLine],
                     heading: [heading.color, 'none'] };
        }"""
    )

    assert style["link"] == style["heading"]


def chart_x_max(page):
    return page.evaluate(
        "() => [...document.querySelectorAll('#charts canvas')]"
        ".map((canvas) => Chart.getChart(canvas).scales.x.max)"
    )


def test_every_date_chart_runs_to_the_end_of_today_however_old_the_solves_are(page):
    page.clock.set_fixed_time("2026-10-15T09:00:00")
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    page.get_by_label("Date").check()

    end_of_today = page.evaluate("() => new Date(2026, 9, 16).getTime() - 1")
    assert chart_x_max(page) == [end_of_today, end_of_today]
    page.select_option("#puzzle", label="2x2 (3 solves)")
    assert chart_x_max(page) == [end_of_today]
    # The lines still stop at their last record.
    assert [p["x"] for p in chart_points(page)[0]["points"]] == [START + 10_000, START + 11_000]


def test_solve_number_charts_do_not_run_to_today(page):
    page.clock.set_fixed_time("2026-10-15T09:00:00")
    upload(page, export())
    page.wait_for_selector("#results:not([hidden])")

    assert chart_x_max(page)[0] < 100
