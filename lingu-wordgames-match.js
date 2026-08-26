// lingu-scripts/lingu-wordgames-match.js

async function dragTo(el, from, to, steps = 12) {
    const opts = {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
    };
    el.dispatchEvent(
        new PointerEvent("pointerdown", {
            ...opts,
            clientX: from.x,
            clientY: from.y,
            buttons: 1,
        }),
    );
    el.dispatchEvent(
        new MouseEvent("mousedown", {
            ...opts,
            clientX: from.x,
            clientY: from.y,
            buttons: 1,
        }),
    );
    for (let i = 1; i <= steps; i++) {
        const x = from.x + (to.x - from.x) * (i / steps);
        const y = from.y + (to.y - from.y) * (i / steps);
        window.dispatchEvent(
            new PointerEvent("pointermove", {
                ...opts,
                clientX: x,
                clientY: y,
                buttons: 1,
            }),
        );
        await new Promise((r) => setTimeout(r, 20));
    }
    window.dispatchEvent(
        new PointerEvent("pointerup", {
            ...opts,
            clientX: to.x,
            clientY: to.y,
            buttons: 0,
        }),
    );
    window.dispatchEvent(
        new MouseEvent("mouseup", {
            ...opts,
            clientX: to.x,
            clientY: to.y,
            buttons: 0,
        }),
    );
}

function getWordPhrase(el) {
    const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
    let fiber = el[fiberKey];
    let depth = 0;
    while (fiber && depth < 8) {
        if (
            fiber.memoizedProps &&
            fiber.memoizedProps.word &&
            fiber.memoizedProps.word.phrase
        ) {
            return fiber.memoizedProps.word.phrase;
        }
        fiber = fiber.return;
        depth++;
    }
    return null;
}

function cardCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

async function waitFor(cond, timeout = 8000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        if (cond()) return true;
        await new Promise((r) => setTimeout(r, 30));
    }
    return false;
}

async function runOneRound() {
    const wordDivs = [...document.querySelectorAll('[data-type="word"]')];
    const audioDivs = [...document.querySelectorAll('[data-type="audio"]')];
    if (wordDivs.length === 0) return 0;

    const pairs = wordDivs.map((w) => {
        const phrase = getWordPhrase(w);
        const translation = phrase ? phrase.wordTranslation.trim() : null;
        const audio = audioDivs.find(
            (a) => a.textContent.trim() === translation,
        );
        return { translation, wordEl: w, audioEl: audio };
    });

    let done = 0;
    for (const p of pairs) {
        if (!p.audioEl) {
            console.log("no match for", p.translation);
            continue;
        }
        const from = cardCenter(p.wordEl);
        const to = cardCenter(p.audioEl);
        await dragTo(p.wordEl, from, to);
        console.log(p.translation, "dragged");
        done++;
        await new Promise((r) => setTimeout(r, 600));
    }
    return done;
}

async function runMatch(maxRounds = 30) {
    const t0 = performance.now();

    const startBtn = document.querySelector('button[title="Почніть"]');
    if (startBtn) startBtn.click();

    let round = 0;
    let prevSig = null;

    while (round < maxRounds) {
        if (
            !(await waitFor(() => {
                const words = [
                    ...document.querySelectorAll('[data-type="word"]'),
                ];
                if (words.length === 0) return false;
                const sig = words.map((w) => w.dataset.projectionId).join(",");
                return sig !== prevSig;
            }, 8000))
        ) {
            console.log("no new cards, stopping. rounds =", round);
            break;
        }

        const done = await runOneRound();
        prevSig = [...document.querySelectorAll('[data-type="word"]')]
            .map((w) => w.dataset.projectionId)
            .join(",");
        round++;
        console.log("round", round, "matched", done, "pairs");
    }
    console.log(
        "total",
        Math.round(performance.now() - t0),
        "ms",
        "rounds =",
        round,
    );
}

runMatch();
