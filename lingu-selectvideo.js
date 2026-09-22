// lingu-scripts/lingu-selectvideo.js

const LINGU_TYPE_TO_SCRIPT = {
    'Tasks::FillGap': 'lingu-fillgap.js',
    'Tasks::InlineDropdown': 'lingu-fillgap.js',
    'Tasks::ArrangeWords': 'lingu-arrangewords.js',
    'Tasks::MarkWord': 'lingu-markword.js',
    'Tasks::MarkWordAudio': 'lingu-markword.js',
    'Tasks::SelectVideo': 'lingu-selectvideo.js',
    'Tasks::ImageObject': 'lingu-imageobject.js',
    'Tasks::Dictation': 'lingu-dictation.js',
    'Tasks::WordGames': 'lingu-wordgames-match.js',
    'Tasks::FillInTable': 'lingu-filltable.js',
    'Tasks::SelectText': 'lingu-selecttext.js'
}

function checkTaskType(actualType, expectedType) {
    if (actualType === expectedType) return true
    const suggestion = LINGU_TYPE_TO_SCRIPT[actualType]
    if (suggestion) {
        console.log(`Тип завдання: ${actualType} -> потрібен скрипт: ${suggestion}`)
    } else {
        console.log(`Тип завдання: ${actualType} -> скрипта для цього типу ще немає`)
    }
    return false
}

function dashRow() {
    const p = document.querySelector('.dashed-pagination')
    if (!p) return null
    let best = null
    for (const c of p.children) {
        if (c.children.length < 2) continue
        const classes = [...c.children].map(d => d.className.replace(/\s*passed\s*/, '').trim())
        if (new Set(classes).size !== 1) continue
        if (!best || c.children.length > best.children.length) best = c
    }
    return best
}

function passedCount() {
    const row = dashRow()
    if (!row) return -1
    return [...row.children].filter(d => d.classList.contains('passed')).length
}

function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim()
}

function realClick(el) {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true }
    el.dispatchEvent(new PointerEvent('pointerdown', base))
    el.dispatchEvent(new MouseEvent('mousedown', base))
    el.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }))
    el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }))
    el.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0, detail: 1 }))
}

function findButton(text) {
    return [...document.querySelectorAll('button')].find(b => norm(b.textContent) === norm(text))
}

function speedUpVideo() {
    const v = document.querySelector('video')
    if (!v) return null
    v.muted = true
    if (v.playbackRate !== 16) v.playbackRate = 16
    if (v.paused && v.currentTime < v.duration) v.play().catch(() => {})
    return v.currentSrc
}

function optionsOnScreen(options) {
    const wanted = options.map(o => o.answer)
    const buttons = [...document.querySelectorAll('button')].map(b => norm(b.textContent))
    const matched = wanted.filter(w => buttons.includes(norm(w)))
    const extraMatches = buttons.filter(t => wanted.map(norm).includes(t))
    return matched.length === wanted.length && extraMatches.length === wanted.length
}

async function waitFor(cond, timeout = 15000) {
    const t0 = performance.now()
    while (performance.now() - t0 < timeout) {
        if (cond()) return true
        speedUpVideo()
        await new Promise(r => setTimeout(r, 30))
    }
    return false
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const data = (await res.json()).task
    const items = data.items

    if (!checkTaskType(data.type, 'Tasks::SelectVideo')) return

    const startBtn = document.querySelector('button[title="Почніть"], button[title="Start"]')
    if (startBtn) startBtn.click()

    if (!await waitFor(() => passedCount() > 0)) {
        console.log('no pagination at start')
        return
    }
    const base = passedCount()
    console.log('base passed =', base, 'type =', data.type, 'items =', items.length)

    const t0 = performance.now()

    for (let i = 0; i < items.length; i++) {
        const correct = items[i].options.find(o => o.correct).answer
        const options = items[i].options
        const want = base + i

        if (!await waitFor(() => passedCount() === want && optionsOnScreen(options))) {
            console.log(i + 1, 'not ready, passed=', passedCount(), 'want', want)
            break
        }
        const btn = findButton(correct)
        if (!btn) { console.log(i + 1, 'no button for', correct); break }
        realClick(btn)
        console.log(i + 1, correct, 'ok')

        if (i === items.length - 1) break
        if (!await waitFor(() => passedCount() > want || passedCount() === -1)) {
            console.log(i + 1, 'not accepted, passed=', passedCount())
            break
        }
    }
    console.log('total', Math.round(performance.now() - t0), 'ms', 'passed=', passedCount())
}

run()
