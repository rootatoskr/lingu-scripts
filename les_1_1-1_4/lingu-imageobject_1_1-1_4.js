function passedCount() {
    const p = document.querySelector('.dashed-pagination')
    if (!p) return -1
    const dashes = [...p.children].find(c => c.children.length > 0 && [...c.children].every(d => /gyfiXm/.test(d.className)))
    if (!dashes) return -1
    return [...dashes.children].filter(d => d.classList.contains('passed')).length
}

function getImage() {
    return document.querySelector('img[alt="Image object"]')
}

async function waitFor(cond, timeout = 15000) {
    const t0 = performance.now()
    while (performance.now() - t0 < timeout) {
        if (cond()) return true
        await new Promise(r => setTimeout(r, 25))
    }
    return false
}

function clickItem(item) {
    const img = getImage()
    const r = img.getBoundingClientRect()
    const x = r.left + r.width * (item.left + item.width / 2) / 100
    const y = r.top + r.height * (item.top + item.height / 2) / 100
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }
    img.dispatchEvent(new PointerEvent('pointerdown', opts))
    img.dispatchEvent(new MouseEvent('mousedown', opts))
    img.dispatchEvent(new PointerEvent('pointerup', opts))
    img.dispatchEvent(new MouseEvent('mouseup', opts))
    img.dispatchEvent(new MouseEvent('click', opts))
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const items = (await res.json()).task.items

    const startBtn = document.querySelector('button[title="Почніть"]')
    if (startBtn) startBtn.click()

    if (!await waitFor(() => passedCount() > 0 && getImage())) {
        console.log('not ready at start, passed=', passedCount(), 'img=', !!getImage())
        return
    }
    const base = passedCount()
    console.log('base passed =', base)

    const t0 = performance.now()

    for (let i = 0; i < items.length; i++) {
        const want = base + i

        if (!await waitFor(() => passedCount() === want && getImage())) {
            console.log(i + 1, 'not ready, passed=', passedCount(), 'want', want)
            break
        }
        clickItem(items[i])
        console.log(i + 1, items[i].instruction, 'clicked')

        if (i === items.length - 1) break
        if (!await waitFor(() => passedCount() > want || passedCount() === -1)) {
            console.log(i + 1, 'not accepted, passed=', passedCount())
            break
        }
    }
    console.log('total', Math.round(performance.now() - t0), 'ms', 'passed=', passedCount())
}

run()
