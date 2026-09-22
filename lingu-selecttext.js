// lingu-scripts/lingu-selecttext.js

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
    'Tasks::FillInTable': 'lingu-selecttext.js',
    'Tasks::SelectText': 'lingu-selecttext.js',
    'Tasks::TrueFalse': 'lingu-selecttext.js'
}

function checkTaskTypeMulti(actualType, expectedTypes) {
    if (expectedTypes.includes(actualType)) return true
    const suggestion = LINGU_TYPE_TO_SCRIPT[actualType]
    if (suggestion) {
        console.log(`Тип завдання: ${actualType} -> потрібен скрипт: ${suggestion}`)
    } else {
        console.log(`Тип завдання: ${actualType} -> скрипта для цього типу ще немає`)
    }
    return false
}

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim() }

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

// ---------- SelectText ----------
function findOptionLabelForQuestion(questionText, answerText, occurrenceIndex) {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')]
    const matches = headings.filter(h => norm(h.textContent) === norm(questionText))
    const heading = matches[occurrenceIndex]
    if (!heading) return null

    const idx = headings.indexOf(heading)
    const nextHeading = headings[idx + 1] || null

    const allLabels = [...document.querySelectorAll('label.item-option')]
    const headingPos = heading.compareDocumentPosition.bind(heading)

    const inRange = allLabels.filter(label => {
        const afterHeading = (headingPos(label) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        if (!afterHeading) return false
        if (nextHeading) {
            const afterNext = (nextHeading.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
            if (afterNext) return false
        }
        return true
    })

    return inRange.find(label => norm(label.textContent) === norm(answerText)) || null
}

async function runSelectText(items, delay) {
    const seenQuestion = {}
    let done = 0
    for (const item of items) {
        const correct = item.options.find(o => o.correct)
        if (!correct) { console.log(item.question, '-> no correct option in data'); continue }

        const key = norm(item.question)
        const occurrenceIndex = seenQuestion[key] || 0
        seenQuestion[key] = occurrenceIndex + 1

        const el = findOptionLabelForQuestion(item.question, correct.answer, occurrenceIndex)
        if (!el) { console.log(item.question, '-> option element not found:', correct.answer); continue }
        realClick(el)
        console.log(item.question, '->', correct.answer)
        done++
        await new Promise(r => setTimeout(r, delay))
    }
    console.log('done, clicked', done, 'of', items.length)
}

// ---------- FillInTable ----------
function typeText(field, text) {
    field.focus()
    const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    let current = ''
    for (const ch of text) {
        field.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }))
        current += ch
        setter.call(field, current)
        field.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: ch, inputType: 'insertText' }))
        field.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }))
    }
    field.dispatchEvent(new Event('blur', { bubbles: true }))
}

function findInputForQuestion(question) {
    const labels = [...document.querySelectorAll('*')].filter(e =>
        e.children.length === 0 && norm(e.textContent) === norm(question)
    )
    for (const label of labels) {
        let row = label
        for (let i = 0; i < 5 && row; i++) {
            const input = row.querySelector ? row.querySelector('input, textarea') : null
            if (input) return input
            row = row.parentElement
        }
    }
    return null
}

async function runFillInTable(items) {
    let filled = 0
    for (const item of items) {
        const answer = item.options[0].answers[0]
        const input = findInputForQuestion(item.question)
        if (!input) { console.log(item.question, '-> input not found'); continue }
        if (input.value && input.value.trim().length > 0) { console.log(item.question, 'already filled'); continue }
        typeText(input, answer)
        console.log(item.question, '->', answer)
        filled++
    }
    console.log('done, filled', filled, 'of', items.length)
}

// ---------- TrueFalse ----------
function findTrueFalseButton(statement, correct) {
    const labels = [...document.querySelectorAll('div')].filter(d =>
        d.children.length === 0 && norm(d.textContent) === norm(statement)
    )
    for (const label of labels) {
        const container = label.parentElement
        if (!container) continue
        const wanted = correct ? 'Правда' : 'помилковий'
        const btn = container.querySelector(`button[role="checkbox"][aria-label="${wanted}"]`)
        if (btn) return btn
    }
    return null
}

async function runTrueFalse(items, delay) {
    let done = 0
    for (const item of items) {
        const btn = findTrueFalseButton(item.statement, item.correct)
        if (!btn) { console.log(item.statement, '-> button not found'); continue }
        realClick(btn)
        console.log(item.statement, '->', item.correct ? 'Правда' : 'Неправда')
        done++
        await new Promise(r => setTimeout(r, delay))
    }
    console.log('done, clicked', done, 'of', items.length)
}

// ---------- диспетчер ----------
async function run(delay = 300) {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const data = (await res.json()).task
    const items = data.items

    if (!checkTaskTypeMulti(data.type, ['Tasks::SelectText', 'Tasks::FillInTable', 'Tasks::TrueFalse'])) return

    if (data.type === 'Tasks::SelectText') {
        await runSelectText(items, delay)
    } else if (data.type === 'Tasks::TrueFalse') {
        await runTrueFalse(items, delay)
    } else {
        await runFillInTable(items)
    }
}

run()
