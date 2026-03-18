const api = typeof browser !== "undefined" ? browser : chrome;
console.log("TCT: Мониторинг активирован.");

let targetLang = "ru";
api.storage.local.get(["targetLang"], (items) => {
    if (items.targetLang) targetLang = items.targetLang;
});

function processMessage(node) {
    // 1. Ищем текстовый фрагмент. 
    // Мы проверяем атрибуты Twitch и специфические классы 7TV/Enhancer
    const messageBody = node.querySelector('[data-a-target="chat-line-message-body"]') || 
                        node.querySelector('.seventv-chat-message-body') ||
                        node.querySelector('.message') ||
                        node.querySelector('.chat-line__message-body');

    if (messageBody && !messageBody.hasAttribute('data-tct-done')) {
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
}

// Слушаем изменения во ВСЕМ body. Это чуть затратнее, но 100% надежно.
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                // Если узел сам является сообщением или содержит его
                if (node.hasAttribute('data-a-target') || 
                    node.classList.contains('chat-line__message') || 
                    node.classList.contains('seventv-message') ||
                    node.querySelector('[data-a-target="chat-line-message-body"]')) {
                    processMessage(node);
                }
            }
        }
    }
});

// Запускаем наблюдение за всем документом сразу
observer.observe(document.body, { childList: true, subtree: true });
console.log("TCT: Обзервер запущен на document.body");