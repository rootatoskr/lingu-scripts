// lingu-scripts/lingu-filltable.js

const LINGU_TYPE_TO_SCRIPT = {
    "Tasks::FillGap": "lingu-fillgap.js",
    "Tasks::InlineDropdown": "lingu-fillgap.js",
    "Tasks::ArrangeWords": "lingu-arrangewords.js",
    "Tasks::MarkWord": "lingu-markword.js",
    "Tasks::MarkWordAudio": "lingu-markword.js",
    "Tasks::SelectVideo": "lingu-selectvideo.js",
    "Tasks::ImageObject": "lingu-imageobject.js",
    "Tasks::Dictation": "lingu-dictation.js",
    "Tasks::WordGames": "lingu-wordgames-match.js",
    "Tasks::FillInTable": "lingu-filltable.js",
    "Tasks::SelectText": "lingu-selecttext.js",
};

function checkTaskType(actualType, expectedType) {
    if (actualType === expectedType) return true;
    const suggestion = LINGU_TYPE_TO_SCRIPT[actualType];
    if (suggestion) {
        console.log(
            `Тип завдання: ${actualType} -> потрібен скрипт: ${suggestion}`,
        );
    } else {
        console.log(
            `Тип завдання: ${actualType} -> скрипта для цього типу ще немає`,
        );
    }
    return false;
}

function norm(s) {
    return (s || "").replace(/\s+/g, " ").trim();
}

function typeText(field, text) {
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
    }
    field.dispatchEvent(new Event("blur", { bubbles: true }));
}

function findInputForQuestion(question) {
    const labels = [...document.querySelectorAll("*")].filter(
        (e) =>
            e.children.length === 0 && norm(e.textContent) === norm(question),
    );
    for (const label of labels) {
        let row = label;
        for (let i = 0; i < 5 && row; i++) {
            const input = row.querySelector
                ? row.querySelector("input, textarea")
                : null;
            if (input) return input;
            row = row.parentElement;
        }
    }
    return null;
}

async function run() {
    const taskId = location.pathname.match(/tasks\/(\d+)/)[1];
    const lessonId = location.pathname.match(/lessons\/(\d+)/)[1];
    const res = await fetch(
        `https://my.lingu.com/api/lessons/${lessonId}/tasks/${taskId}`,
        { credentials: "include" },
    );
    const data = (await res.json()).task;
    const items = data.items;

    if (!checkTaskType(data.type, "Tasks::FillInTable")) return;

    let filled = 0;
    for (const item of items) {
        const answer = item.options[0].answers[0];
        const input = findInputForQuestion(item.question);
        if (!input) {
            console.log(item.question, "-> input not found");
            continue;
        }
        if (input.value && input.value.trim().length > 0) {
            console.log(item.question, "already filled");
            continue;
        }
        typeText(input, answer);
        console.log(item.question, "->", answer);
        filled++;
    }
    console.log("done, filled", filled, "of", items.length);
}

run();
