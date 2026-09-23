// lingu-scripts/lingu-imageobject.js

const LINGU_TYPE_TO_SCRIPT = {
    "Tasks::FillGap": "lingu-fillgap.js",
    "Tasks::InlineDropdown": "lingu-fillgap.js",
    "Tasks::ArrangeWords": "lingu-arrangewords.js",
    "Tasks::MarkWord": "lingu-markword.js",
    "Tasks::MarkWordAudio": "lingu-markword.js",
    "Tasks::SelectVideo": "lingu-selectvideo.js",
    "Tasks::ImageObject": "lingu-imageobject.js",
    "Tasks::Dictation": "lingu-dictation.js",
    "Tasks::WordGames": "lingu-wordgames-match.js",
    "Tasks::FillInTable": "lingu-filltable.js",
    "Tasks::SelectText": "lingu-selecttext.js",
};

function checkTaskType(actualType, expectedType) {
    if (actualType === expectedType) return true;
    const suggestion = LINGU_TYPE_TO_SCRIPT[actualType];
    if (suggestion) {
        console.log(
            `Тип завдання: ${actualType} -> потрібен скрипт: ${suggestion}`,
        );
    } else {
        console.log(
            `Тип завдання: ${actualType} -> скрипта для цього типу ще немає`,
        );
    }
    return false;
}

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

function getImage() {
    return document.querySelector('img[alt="Image object"]');
}

function audioScreen() {
    return document.body.innerText.includes("Натисніть, щоб відтворити звук");
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

async function waitImageStable(stableMs = 200, timeout = 5000) {
    const t0 = performance.now();
    let lastSnapshot = null;
    let stableSince = null;
    while (performance.now() - t0 < timeout) {
        const img = getImage();
        if (!img) {
            lastSnapshot = null;
            stableSince = null;
            await new Promise((r) => setTimeout(r, 50));
            continue;
        }
        const r = img.getBoundingClientRect();
        const snapshot = JSON.stringify({
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
        });
        if (snapshot === lastSnapshot) {
            if (stableSince === null) stableSince = performance.now();
            if (performance.now() - stableSince >= stableMs) return true;
        } else {
            stableSince = null;
        }
        lastSnapshot = snapshot;
        await new Promise((r) => setTimeout(r, 50));
    }
    return false;
}

function clickItem(item) {
    const img = getImage();
    const r = img.getBoundingClientRect();
    const x = r.left + (r.width * (item.left + item.width / 2)) / 100;
    const y = r.top + (r.height * (item.top + item.height / 2)) / 100;
    const target = document.elementFromPoint(x, y) || img;
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
    target.dispatchEvent(new PointerEvent("pointerdown", base));
    target.dispatchEvent(new MouseEvent("mousedown", base));
    target.dispatchEvent(
        new PointerEvent("pointerup", { ...base, buttons: 0 }),
    );
    target.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
    target.dispatchEvent(
        new MouseEvent("click", { ...base, buttons: 0, detail: 1 }),
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

    if (!checkTaskType(data.type, "Tasks::ImageObject")) return;

    const startBtn = document.querySelector('button[title="Почніть"]');
    if (startBtn) realClick(startBtn);

    if (!(await waitFor(() => passedCount() > 0 && getImage()))) {
        console.log(
            "not ready at start, passed=",
            passedCount(),
            "img=",
            !!getImage(),
        );
        return;
    }
    const base = passedCount();
    const dashes = dashRow() ? dashRow().children.length : -1;
    console.log(
        "base passed =",
        base,
        "dashes =",
        dashes,
        "items =",
        items.length,
    );
    if (dashes !== items.length) console.log("warning: dashes != items");

    const t0 = performance.now();

    for (let i = 0; i < items.length; i++) {
        const want = base + i;

        if (!(await waitFor(() => passedCount() === want && getImage()))) {
            console.log(
                i + 1,
                "not ready, passed=",
                passedCount(),
                "want",
                want,
            );
            break;
        }

        const stable = await waitImageStable();
        if (!stable) {
            console.log(
                i + 1,
                "зображення не стабілізувалось вчасно, продовжую обережно",
            );
        }

        clickItem(items[i]);
        console.log(i + 1, items[i].instruction || items[i].id, "clicked");

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

run();
