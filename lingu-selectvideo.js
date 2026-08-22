// lingu-scripts/lingu-markword.js

function dashRow() {
    const p = document.querySelector(".dashed-pagination");
    if (!p) return null;
    let best = null;
    for (const c of p.children) {
        if (c.children.length < 2) continue;
        const classes = [...c.children].map((d) =>
            d.className.replace(/\s*passed\s*/, "").trim(),
        );
        if (new Set(classes).size !== 1) continue;
        if (!best || c.children.length > best.children.length) best = c;
    }
    return best;
}

function passedCount() {
    const row = dashRow();
    if (!row) return -1;
    return [...row.children].filter((d) => d.classList.contains("passed"))
        .length;
}

function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim();
}

function audioScreen() {
    return document.body.innerText.includes("Натисніть, щоб відтворити звук");
}

async function waitFor(cond, timeout = 15000) {
    const t0 = performance.now();
    let clicked = false;
    while (performance.now() - t0 < timeout) {
        if (cond()) return true;
        if (!clicked && audioScreen()) {
            clicked = true;
            document.body.dispatchEvent(
                new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    clientX: 50,
                    clientY: 50,
                }),
            );
        } else if (!audioScreen()) {
            clicked = false;
        }
        await new Promise((r) => setTimeout(r, 25));
    }
    return false;
}

function wordSpans() {
    return [...document.querySelectorAll("span")].filter(
        (s) => s.children.length === 0 && norm(s.textContent).length > 0,
    );
}

function statementWordsOnScreen(statement) {
    const wanted = statement
        .filter((w) => !w.disabled)
        .map((w) => norm(w.word));
    const texts = wordSpans().map((s) => norm(s.textContent));
    return wanted.every((w) => texts.includes(w));
}

function findWordSpan(word, usedSet) {
    return wordSpans().find(
        (s) => norm(s.textContent) === norm(word) && !usedSet.has(s),
    );
}

async function runMarkWord(items, base) {
    const t0 = performance.now();
    for (let i = 0; i < items.length; i++) {
        const statement = items[i].statement;
        const solutionWords = statement
            .filter((w) => w.solution)
            .map((w) => w.word);
        const want = base + i;

        if (
            !(await waitFor(
                () =>
                    passedCount() === want && statementWordsOnScreen(statement),
            ))
        ) {
            console.log(
                i + 1,
                "not ready, passed=",
                passedCount(),
                "want",
                want,
            );
            break;
        }

        const used = new Set();
        let failed = false;
        for (const w of solutionWords) {
            const span = findWordSpan(w, used);
            if (!span) {
                console.log(i + 1, "no span for", JSON.stringify(w));
                failed = true;
                break;
            }
            used.add(span);
            span.click();
            await new Promise((r) => setTimeout(r, 250));
        }
        if (failed) break;
        console.log(
            i + 1,
            statement
                .map((w) => w.word)
                .join("")
                .trim(),
            "->",
            solutionWords.join(", "),
        );

        if (i === items.length - 1) break;
        if (
            !(await waitFor(() => passedCount() > want || passedCount() === -1))
        ) {
            console.log(i + 1, "not accepted, passed=", passedCount());
            break;
        }
    }
    console.log(
        "total",
        Math.round(performance.now() - t0),
        "ms",
        "passed=",
        passedCount(),
    );
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1];
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1];
    const res = await fetch(
        `https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`,
        { credentials: "include" },
    );
    const data = (await res.json()).task;
    const items = data.items;

    const startBtn = document.querySelector('button[title="Почніть"]');
    if (startBtn) startBtn.click();

    if (!(await waitFor(() => passedCount() > 0))) {
        console.log("no pagination at start");
        return;
    }
    const base = passedCount();
    console.log(
        "base passed =",
        base,
        "type =",
        data.type,
        "items =",
        items.length,
    );

    if (
        data.type === "Tasks::MarkWord" ||
        data.type === "Tasks::MarkWordAudio"
    ) {
        await runMarkWord(items, base);
    } else {
        console.log("unsupported type:", data.type);
    }
}

run();
