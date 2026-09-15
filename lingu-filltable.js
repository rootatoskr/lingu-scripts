// lingu-scripts/lingu-filltable.js
function norm(s) { return (s || '').replace(/\s+/g, ' ').trim() }

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
        // піднімаємось до рядка таблиці і шукаємо поле введення в ньому
        let row = label
        for (let i = 0; i < 5 && row; i++) {
            const input = row.querySelector ? row.querySelector('input, textarea') : null
            if (input) return input
            row = row.parentElement
        }
    }
    return null
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1]
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1]
    const res = await fetch(`https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`, { credentials: 'include' })
    const data = (await res.json()).task
    const items = data.items

    if (data.type !== 'Tasks::FillInTable') {
        console.log('unsupported type:', data.type)
        return
    }

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

run()
