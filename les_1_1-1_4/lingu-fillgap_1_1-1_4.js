function passedCount() {
    const p = document.querySelector('.dashed-pagination')
    if (!p) return -1
    const dashes = [...p.children].find(c => c.children.length > 0 && [...c.children].every(d => /gyfiXm/.test(d.className)))
    if (!dashes) return -1
    return [...dashes.children].filter(d => d.classList.contains('passed')).length
}

function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim()
}

function buttonTexts() {
    return [...document.querySelectorAll('button')].map(b => norm(b.textContent))
}

function findLastButton(word) {
    const all = [...document.querySelectorAll('button')].filter(b => norm(b.textContent) === norm(word))
    return all[all.length - 1]
}

function allAnswersOnScreen(groups) {
    const texts = buttonTexts()
    return groups.every(g => g.every(a => texts.includes(norm(a))))
}

async function waitFor(cond, timeout = 15000) {
    const t0 = performance.now()
    while (performance.now() - t0 < timeout) {
        if (cond()) return true
        await new Promise(r => setTimeout(r, 25))
    }
    return false
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const items = (await res.json()).task.items

    const startBtn = document.querySelector('button[title="Почніть"]')
    if (startBtn) startBtn.click()

    if (!await waitFor(() => passedCount() > 0)) {
        console.log('no pagination at start')
        return
    }
    const base = passedCount()
    console.log('base passed =', base)

    const t0 = performance.now()

    for (let i = 0; i < items.length; i++) {
        const words = items[i].solution
        const groups = items[i].answers
        const want = base + i

        if (!await waitFor(() => passedCount() === want && allAnswersOnScreen(groups))) {
            console.log(i + 1, 'not ready, passed=', passedCount(), 'want', want, buttonTexts().join('|'))
            break
        }

        let failed = false
        for (const w of words) {
            const btn = findLastButton(w)
            if (!btn) { console.log(i + 1, 'no button for', w, buttonTexts().join('|')); failed = true; break }
            btn.click()
            await new Promise(r => setTimeout(r, 300))
        }
        if (failed) break
        console.log(i + 1, items[i].statement, '->', words.join(' + '))

        if (i === items.length - 1) break
        if (!await waitFor(() => passedCount() > want || passedCount() === -1)) {
            console.log(i + 1, 'not accepted, passed=', passedCount())
            break
        }
    }
    console.log('total', Math.round(performance.now() - t0), 'ms', 'passed=', passedCount())
}

run()
