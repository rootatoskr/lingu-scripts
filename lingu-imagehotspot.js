// lingu-scripts/lingu-imagehotspot.js

const LINGU_TYPE_TO_SCRIPT = {
    "Tasks::FillGap": "lingu-fillgap.js",
    "Tasks::InlineDropdown": "lingu-fillgap.js",
    "Tasks::ArrangeWords": "lingu-arrangewords.js",
    "Tasks::MarkWord": "lingu-markword.js",
    "Tasks::MarkWordAudio": "lingu-markword.js",
    "Tasks::SelectVideo": "lingu-selectvideo.js",
    "Tasks::ImageObject": "lingu-imageobject.js",
    "Tasks::ImageHotspot": "lingu-imagehotspot.js",
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

async function waitFor(cond, timeout = 15000, step = 100) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        const v = cond();
        if (v) return v;
        await new Promise((r) => setTimeout(r, step));
    }
    return null;
}

function getMarkers() {
    return [...document.querySelectorAll("button.sc-boJDB")];
}

function markerPercent(marker, imgRect) {
    const mr = marker.getBoundingClientRect();
    const cx = mr.left + mr.width / 2;
    const cy = mr.top + mr.height / 2;
    return {
        left: ((cx - imgRect.left) / imgRect.width) * 100,
        top: ((cy - imgRect.top) / imgRect.height) * 100,
    };
}

function matchMarkersToItems(markers, items, imgRect) {
    const used = new Set();
    const pairs = [];
    for (const marker of markers) {
        const p = markerPercent(marker, imgRect);
        let best = null;
        let bestD = Infinity;
        for (const item of items) {
            if (used.has(item.id)) continue;
            const d = Math.hypot(item.top - p.top, item.left - p.left);
            if (d < bestD) {
                bestD = d;
                best = item;
            }
        }
        if (best) {
            used.add(best.id);
            pairs.push({ marker, item: best, distance: bestD });
        }
    }
    return pairs;
}

function visibleOptionButtons() {
    return [...document.querySelectorAll("li button")].filter(
        (b) => b.offsetParent !== null,
    );
}

async function run(delay = 400) {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1];
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1];
    const res = await fetch(
        `https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`,
        { credentials: "include" },
    );
    const data = (await res.json()).task;

    if (!checkTaskType(data.type, "Tasks::ImageHotspot")) return;

    const items = data.items;

    const startBtn = document.querySelector(
        'button[title="Почніть"], button[title="Start"]',
    );
    if (startBtn) realClick(startBtn);

    const img = await waitFor(
        () => document.querySelector('img[alt="Image object"], img'),
        5000,
    );
    if (!img) {
        console.log("зображення не знайдено після старту");
        return;
    }

    const markers = await waitFor(() => {
        const m = getMarkers();
        return m.length === items.length ? m : null;
    }, 5000);

    if (!markers) {
        console.log(
            `Невідповідність: items=${items.length}, маркерів=${getMarkers().length} -> не продовжую`,
        );
        return;
    }

    const imgRect = img.getBoundingClientRect();
    const pairs = matchMarkersToItems(markers, items, imgRect);
    if (pairs.length !== items.length) {
        console.log(
            "не вдалось зіставити всі мітки з items ->",
            pairs.length,
            "з",
            items.length,
        );
        return;
    }

    const t0 = performance.now();
    let done = 0;

    for (const { marker, item } of pairs) {
        if (marker.disabled) {
            console.log(item.word.body, "вже відповідено");
            done++;
            continue;
        }

        realClick(marker);
        await new Promise((r) => setTimeout(r, delay));

        const found = await waitFor(
            () => {
                const btns = visibleOptionButtons();
                return (
                    btns.find(
                        (b) => norm(b.textContent) === norm(item.word.body),
                    ) || null
                );
            },
            2000,
            100,
        );

        if (!found) {
            console.log(
                item.word.body,
                "-> кнопку варіанту не знайдено серед видимих:",
                visibleOptionButtons()
                    .map((b) => norm(b.textContent))
                    .join("|"),
            );
            break;
        }

        realClick(found);

        const solved = await waitFor(() => marker.disabled, 2000, 100);
        if (!solved) {
            console.log(
                item.word.body,
                "-> маркер не позначився як відповіджений",
            );
            break;
        }

        const closed = await waitFor(
            () => visibleOptionButtons().length === 0,
            3000,
            100,
        );
        if (!closed) {
            console.log(
                item.word.body,
                "-> панель варіантів не закрилась вчасно, продовжую обережно",
            );
        }

        console.log(item.word.body, "-> ok");
        done++;
        await new Promise((r) => setTimeout(r, delay));
    }

    console.log(
        "total",
        Math.round(performance.now() - t0),
        "ms",
        "done,",
        done,
        "of",
        pairs.length,
    );
}

run();
