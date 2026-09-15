// lingu_scripts/lingu-fake-cursor-activity.js

function startAntiIdle(intervalMs) {
    if (window.__antiIdleInterval) {
        clearInterval(window.__antiIdleInterval)
    }
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let dir = 1
    window.__antiIdleInterval = setInterval(() => {
        x += dir
        dir = -dir
        const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, pointerId: 1, pointerType: 'mouse' }
        document.dispatchEvent(new PointerEvent('pointermove', base))
        document.dispatchEvent(new MouseEvent('mousemove', base))
    }, intervalMs)
    return 'anti-idle started, interval id: ' + window.__antiIdleInterval
}
startAntiIdle(10000)
