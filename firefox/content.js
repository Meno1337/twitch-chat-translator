const api = typeof browser !== "undefined" ? browser : chrome;

console.log("TCT: Мониторинг активирован (Firefox/Chrome compatible).");

let targetLang = "ru";
let translationColor = "#9147ff";       // дефолтный цвет из оригинального стиля
let translationEnabled = true;          // ← добавлен тумблер (по умолчанию включён)

// Загрузка настроек один раз при старте
api.storage.sync.get(
    ["targetLang", "translationColor", "translationEnabled"],
    (items) => {
        if (api.runtime.lastError) {
            console.warn("TCT: storage get error →", api.runtime.lastError);
            return;
        }
        if (items.targetLang)       targetLang       = items.targetLang;
        if (items.translationColor) translationColor = items.translationColor;
        if (items.translationEnabled !== undefined) {
            translationEnabled = !!items.translationEnabled;
        }
    }
);

// Отслеживание изменений настроек в реальном времени
api.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (changes.targetLang?.newValue)       targetLang       = changes.targetLang.newValue;
    if (changes.translationColor?.newValue) translationColor = changes.translationColor.newValue;
    if (changes.translationEnabled?.newValue !== undefined) {
        translationEnabled = !!changes.translationEnabled.newValue;
        console.log("TCT: translationEnabled changed →", translationEnabled);
    }
});

const chatMessageBodySelectors =
    '[data-a-target="chat-line-message-body"],' +
    '[data-a-target="chat-message-body"],' +
    '.seventv-chat-message-body,' +
    '.chat-line__message-body';

function extractMessageBody(node) {
    if (!node || node.nodeType !== 1) return [];
    if (node.matches && node.matches(chatMessageBodySelectors)) return [node];
    return Array.from(node.querySelectorAll(chatMessageBodySelectors));
}

function extractMessageBodiesWithFallback(node) {
    const specific = extractMessageBody(node);
    if (specific.length) return specific;

    if (!node.classList) return [];
    const looksLikeChatContainer =
        node.classList.contains('chat-line__message') ||
        node.classList.contains('seventv-message');

    if (!looksLikeChatContainer) return [];
    return Array.from(node.querySelectorAll('.message'));
}

function translateMessageBody(messageBody) {
    if (!translationEnabled) return;                     // ← ключевая проверка

    if (!messageBody || messageBody.hasAttribute('data-tct-done')) return;
    messageBody.setAttribute('data-tct-done', 'true');

    const originalText = messageBody.innerText.trim();
    if (originalText.length < 2 || originalText.startsWith('!') || originalText.startsWith('http')) return;

    console.log("TCT: Обнаружено →", originalText);

    api.runtime.sendMessage(
        { type: "translate", text: originalText, tl: targetLang },
        (response) => {
            if (api.runtime.lastError) {
                console.warn("TCT: sendMessage error →", api.runtime.lastError.message);
                return;
            }

            if (response && response.translated) {
                const translation = document.createElement("div");
                translation.innerText = `➤ ${response.translated}`;
                translation.style.cssText = `
                    color: ${translationColor} !important;
                    font-size: 0.85em !important;
                    display: block !important;
                    opacity: 0.9;
                    font-style: italic;
                    margin-top: 2px;
                    border-left: 2px solid #9147ff;
                    padding-left: 4px;
                `;
                messageBody.appendChild(translation);
            }
        }
    );
}

function processMessage(node) {
    const messageBodies = extractMessageBodiesWithFallback(node);
    for (const messageBody of messageBodies) {
        translateMessageBody(messageBody);
    }
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            if (
                (node.matches && node.matches(chatMessageBodySelectors)) ||
                (node.querySelector && node.querySelector(chatMessageBodySelectors)) ||
                node.classList?.contains('chat-line__message') ||
                node.classList?.contains('seventv-message')
            ) {
                processMessage(node);
            }
        }
    }
});

// Обработка уже существующих сообщений (VOD, клипы, перезагрузка чата)
document.querySelectorAll(chatMessageBodySelectors).forEach((mb) => translateMessageBody(mb));
document.querySelectorAll('.chat-line__message, .seventv-message').forEach((container) => processMessage(container));

// Наблюдение за всем body — самый надёжный вариант для динамического чата Twitch
observer.observe(document.body, { childList: true, subtree: true });

console.log("TCT: Обзервер запущен на document.body");