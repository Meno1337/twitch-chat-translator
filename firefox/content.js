const api = typeof browser !== "undefined" ? browser : chrome;
console.log("TCT: Мониторинг активирован.");

let targetLang = "ru";
api.storage.local.get(["targetLang"], (items) => {
    if (items.targetLang) targetLang = items.targetLang;
});

const chatMessageBodySelectors =
    '[data-a-target="chat-line-message-body"],' +
    '[data-a-target="chat-message-body"],' +
    '.seventv-chat-message-body,' +
    '.chat-line__message-body';

function extractMessageBody(node) {
    if (!node || node.nodeType !== 1) return [];

    // Если селектор совпал прямо на узле - используем его.
    if (node.matches && node.matches(chatMessageBodySelectors)) return [node];

    // Иначе ищем внутри.
    return Array.from(node.querySelectorAll(chatMessageBodySelectors));
}

function extractMessageBodiesWithFallback(node) {
    const specific = extractMessageBody(node);
    if (specific.length) return specific;

    // Фолбэк: старая логика иногда срабатывала на `.message`, но чтобы не переводить лишнее,
    // включаем фолбэк только для узлов, которые похожи на контейнер чата.
    if (!node.classList) return [];
    const looksLikeChatContainer =
        node.classList.contains('chat-line__message') ||
        node.classList.contains('seventv-message');

    if (!looksLikeChatContainer) return [];

    return Array.from(node.querySelectorAll('.message'));
}

function translateMessageBody(messageBody) {
    if (!messageBody || messageBody.hasAttribute('data-tct-done')) return;
    messageBody.setAttribute('data-tct-done', 'true');

    const originalText = messageBody.innerText.trim();

    // Пропускаем пустоту, ссылки и команды
    if (originalText.length < 2 || originalText.startsWith('!') || originalText.startsWith('http')) return;

    console.log("TCT: Обнаружено ->", originalText);

    api.runtime.sendMessage(
        { type: "translate", text: originalText, tl: targetLang },
        (response) => {
            if (response && response.translated) {
                const translation = document.createElement("div");
                translation.innerText = `➤ ${response.translated}`;
                translation.style.cssText = `
                    color: #9147ff !important; 
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
    for (const messageBody of messageBodies) translateMessageBody(messageBody);
}

// Слушаем изменения во ВСЕМ body. Это чуть затратнее, но 100% надежно.
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                // Если узел сам является сообщением или содержит его - обрабатываем.
                if ((node.matches && node.matches(chatMessageBodySelectors)) ||
                    (node.querySelector && node.querySelector(chatMessageBodySelectors)) ||
                    node.classList?.contains('chat-line__message') ||
                    node.classList?.contains('seventv-message')) {
                    processMessage(node);
                }
            }
        }
    }
});

// Обрабатываем то, что уже есть в DOM (актуально для VOD/клипов, где чат загружается раньше).
document.querySelectorAll(chatMessageBodySelectors).forEach((mb) => translateMessageBody(mb));
// Иногда на VOD/клипах нужный контейнер имеет другой markup: обрабатываем контейнеры и фолбэчим `.message`.
document.querySelectorAll('.chat-line__message, .seventv-message').forEach((container) => processMessage(container));

// Запускаем наблюдение за всем документом сразу
observer.observe(document.body, { childList: true, subtree: true });
console.log("TCT: Обзервер запущен на document.body");