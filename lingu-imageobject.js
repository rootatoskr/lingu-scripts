// lingu-scripts/lingu-imageobject.js

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
    const items = (await res.json()).task.items;

    const startBtn = document.querySelector('button[title="Почніть"]');
    if (startBtn) startBtn.click();

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
