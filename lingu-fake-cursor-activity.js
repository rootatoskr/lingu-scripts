function lingu_fakeCursorActivity() {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const el = document.elementFromPoint(x, y) || document.body;
    const opts = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
    };
    el.dispatchEvent(new PointerEvent("pointermove", opts));
    el.dispatchEvent(new MouseEvent("mousemove", opts));
}

const __cursor_interval = setInterval(lingu_fakeCursorActivity, 5000);
