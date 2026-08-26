// lingu-scripts/lingu-fillgap.js

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

function realClick(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const base = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        view: window,
        button: 0,
        buttons: 1,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
    };
    el.dispatchEvent(new PointerEvent("pointerdown", base));
    el.dispatchEvent(new MouseEvent("mousedown", base));
    el.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
    el.dispatchEvent(
        new MouseEvent("click", { ...base, buttons: 0, detail: 1 }),
    );
}

// звук грає через howler.js (Web Audio, не <audio>), і перехід чекає його події 'end'.
// прискорюємо всі активні звуки — подія 'end' настає майже одразу
function speedUpAudio() {
    const H = window.Howler;
    if (!H || !H._howls) return false;
    let touched = false;
    for (const h of H._howls) {
        try {
            if (h.playing && h.playing()) {
                h.rate(16);
                touched = true;
            }
        } catch (e) {}
    }
    return touched;
}

function contentButtons() {
    return [...document.querySelectorAll("button")].filter((b) => {
        if (b.title) return false;
        return norm(b.textContent).length > 0;
    });
}

function buttonTexts() {
    return contentButtons().map((b) => norm(b.textContent));
}

function dropdownSegments(groupCount) {
    const btns = contentButtons();
    if (groupCount <= 1) return btns.length > 0 ? [btns] : null;
    const starts = [];
    btns.forEach((b, i) => {
        if (norm(b.textContent) === "•••") starts.push(i);
    });
    if (starts.length !== groupCount) return null;
    const segs = [];
    for (let k = 0; k < groupCount; k++) {
        const from = starts[k] + 1;
        const to = k + 1 < starts.length ? starts[k + 1] : btns.length;
        segs.push(btns.slice(from, to));
    }
    return segs;
}

function allAnswersOnScreen(groups) {
    const texts = buttonTexts();
    return groups.every((g) => g.every((a) => texts.includes(norm(a))));
}

async function waitFor(cond, timeout = 15000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        if (cond()) return true;
        await new Promise((r) => setTimeout(r, 25));
    }
    return false;
}

// очікування наступного пункту: весь час прискорюємо звук, що грає
async function waitNext(want, timeout = 15000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        if (passedCount() > want) return true;
        speedUpAudio();
        await new Promise((r) => setTimeout(r, 25));
    }
    return false;
}

async function waitStable(cond, timeout = 15000, stableMs = 150) {
    const t0 = performance.now();
    let stableSince = null;
    while (performance.now() - t0 < timeout) {
        if (cond()) {
            if (stableSince === null) stableSince = performance.now();
            if (performance.now() - stableSince >= stableMs) return true;
        } else {
            stableSince = null;
        }
        await new Promise((r) => setTimeout(r, 25));
    }
    return false;
}

async function run(delay = 300) {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1];
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1];
    const res = await fetch(
        `https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`,
        { credentials: "include" },
    );
    const data = (await res.json()).task;
    const items = data.items;

    if (
        data.type !== "Tasks::FillGap" &&
        data.type !== "Tasks::InlineDropdown"
    ) {
        console.log("unsupported type:", data.type);
        return;
    }

    console.log("Howler present:", !!window.Howler);

    const startBtn = document.querySelector(
        'button[title="Почніть"], button[title="Start"]',
    );
    if (startBtn) startBtn.click();

    if (!(await waitFor(() => passedCount() > 0))) {
        console.log("no pagination at start");
        return;
    }
    const base = passedCount();
    const dashes = dashRow() ? dashRow().children.length : -1;
    console.log(
        "base passed =",
        base,
        "type =",
        data.type,
        "dashes =",
        dashes,
        "items =",
        items.length,
    );
    if (dashes !== items.length) console.log("warning: dashes != items");

    const t0 = performance.now();

    for (let i = 0; i < items.length; i++) {
        const words = items[i].solution;
        const groups = items[i].answers;
        const want = base + i;

        if (
            !(await waitStable(
                () =>
                    passedCount() === want &&
                    allAnswersOnScreen(groups) &&
                    dropdownSegments(groups.length) !== null,
            ))
        ) {
            console.log(
                i + 1,
                "not ready, passed=",
                passedCount(),
                "want",
                want,
                buttonTexts().join("|"),
            );
            break;
        }

        const segs = dropdownSegments(groups.length);
        if (!segs) {
            console.log(i + 1, "no segments", buttonTexts().join("|"));
            break;
        }

        const targets = [];
        let failed = false;
        for (let k = 0; k < words.length; k++) {
            const seg = segs[k] || segs[segs.length - 1];
            const btn = seg.find((b) => norm(b.textContent) === norm(words[k]));
            if (!btn) {
                console.log(
                    i + 1,
                    "no button for",
                    words[k],
                    "in segment",
                    k,
                    "::",
                    seg.map((b) => norm(b.textContent)).join("|"),
                );
                failed = true;
                break;
            }
            targets.push(btn);
        }
        if (failed) break;

        for (const btn of targets) {
            realClick(btn);
            await new Promise((r) => setTimeout(r, delay));
        }
        console.log(i + 1, items[i].statement, "->", words.join(" + "));

        if (i === items.length - 1) break;
        if (!(await waitNext(want))) {
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

run(300);
