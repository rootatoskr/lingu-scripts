function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function speedUpVideo() {
    const v = document.querySelector('video')
    if (!v) return null
    v.muted = true
    if (v.playbackRate !== 16) v.playbackRate = 16
    if (v.paused && v.currentTime < v.duration) v.play().catch(() => {})
    return v.currentSrc
}

function findButton(text) {
    return [...document.querySelectorAll('button')].find(b => norm(b.textContent) === norm(text))
}

function optionsOnScreen(options) {
    const buttons = [...document.querySelectorAll('button')].map(b => norm(b.textContent))
    return options.every(o => buttons.includes(norm(o.answer)))
}

async function poll(cond, timeout) {
    const t0 = performance.now()
    while (performance.now() - t0 < timeout) {
        speedUpVideo()
        const r = cond()
        if (r) return r
        await new Promise(r => setTimeout(r, 30))
    }
    return false
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const items = (await res.json()).task.items

    document.querySelector('button[title="Почніть"]')?.click()

    const t0 = performance.now()
    let prevSrc = null

    for (let i = 0; i < items.length; i++) {
        const options = items[i].options
        const correct = options.find(o => o.correct).answer

        if (!await poll(() => { const s = speedUpVideo(); return s && s !== prevSrc ? s : false }, 20000)) {
            console.log(i + 1, 'no new video')
            break
        }
        prevSrc = document.querySelector('video').currentSrc

        if (!await poll(() => optionsOnScreen(options), 20000)) {
            console.log(i + 1, 'no options')
            break
        }
        findButton(correct).click()
        console.log(i + 1, correct, 'ok')
    }
    console.log('total', Math.round(performance.now() - t0), 'ms')
}

run()
