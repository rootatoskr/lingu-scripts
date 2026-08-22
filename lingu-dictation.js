// lingu-scripts/lingu-dictation.js

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

function getField() {
    return document.querySelector('textarea, input[type="text"]');
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

async function typeText(field, text, delay) {
    field.focus();
    const proto =
        field.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    let current = "";
    for (const ch of text) {
        field.dispatchEvent(
            new KeyboardEvent("keydown", { key: ch, bubbles: true }),
        );
        current += ch;
        setter.call(field, current);
        field.dispatchEvent(
            new InputEvent("input", {
                bubbles: true,
                cancelable: true,
                data: ch,
                inputType: "insertText",
            }),
        );
        field.dispatchEvent(
            new KeyboardEvent("keyup", { key: ch, bubbles: true }),
        );
        await new Promise((r) => setTimeout(r, delay));
    }
}

async function run(delay = 30) {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1];
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1];
    const res = await fetch(
        `https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`,
        { credentials: "include" },
    );
    const items = (await res.json()).task.items;

    const startBtn = document.querySelector('button[title="Почніть"]');
    if (startBtn) startBtn.click();

    if (!(await waitFor(() => passedCount() > 0))) {
        console.log("no pagination at start");
        return;
    }
    if (!(await waitFor(() => getField()))) {
        console.log("no input field at start");
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
    // lastField: React замінює вузол textarea на кожному пункті, тому порівняння за посиланням надійне
    let lastField = null;

    for (let i = 0; i < items.length; i++) {
        const text = items[i].sentence;
        const want = base + i;
        const needWait = text.length * delay < 200;

        if (
            !(await waitFor(() => {
                const f = getField();
                if (passedCount() !== want || !f || f === lastField)
                    return false;
                return needWait ? !audioScreen() : true;
            }))
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

        const field = getField();
        lastField = field;
        await typeText(field, text, delay);
        console.log(i + 1, text, "typed");

        if (i === items.length - 1) break;
        if (!(await waitFor(() => passedCount() > want))) {
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

run(30);
