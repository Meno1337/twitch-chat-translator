let targetLang = "ru";
let translationColor = "#00e6cb";

const CHAT_MESSAGE_SELECTORS = ['.chat-line__message', '[data-a-target="chat-line-message"]'];
const CHAT_TEXT_SELECTORS = ['.chat-line__message-body', '[data-a-target="chat-message-text"]'];

const updateSettings = () => {
    chrome.storage.sync.get(['targetLang', 'translationColor'], (result) => {
        try {
            if (chrome.runtime.lastError) return;
            if (result?.targetLang) targetLang = result.targetLang;
            if (result?.translationColor) translationColor = result.translationColor;
        } catch {
            // Контекст расширения мог быть инвалидирован.
        }
    });
};
updateSettings();

// Обновляем настройки по событию (меньше фоновых запросов и проблем с контекстом).
chrome.storage.onChanged.addListener((changes, areaName) => {
    try {
        if (areaName !== "sync") return;
        if (changes.targetLang?.newValue) targetLang = changes.targetLang.newValue;
        if (changes.translationColor?.newValue) translationColor = changes.translationColor.newValue;
    } catch {
        // Контекст мог быть инвалидирован.
    }
});

function safeSendMessage(message, responseCallback) {
    try {
        const maybePromise = chrome.runtime.sendMessage(message, (response) => {
            try {
                responseCallback?.(response);
            } catch {
                // Ничего не делаем: контекст мог быть инвалидирован.
            }
        });

        // В некоторых сценариях Chrome может возвращать Promise даже при callback.
        if (maybePromise && typeof maybePromise.catch === "function") {
            maybePromise.catch(() => {});
        }
    } catch {
        // Контекст расширения мог быть инвалидирован.
    }
}

function processText(textElement) {
    if (!textElement || textElement.dataset.translated === "true") return;

    const originalText = textElement.innerText.trim();
    if (originalText.length < 2 || /^\d+$/.test(originalText)) return;

    textElement.dataset.translated = "true";

    safeSendMessage(
        {
            type: "translate",
            text: originalText,
            tl: targetLang
        },
        (response) => {
            try {
                if (chrome.runtime.lastError) return;
                if (response && response.translated) {
                    if (response.translated.toLowerCase() === originalText.toLowerCase()) return;

                    const translationDiv = document.createElement("div");
                    // Используем переменную translationColor для цвета
                    translationDiv.style.cssText = `
                        color: ${translationColor}; 
                        font-size: 0.85em; 
                        margin: 2px 0 5px 15px; 
                        border-left: 2px solid #9147ff; 
                        padding-left: 8px; 
                        font-style: italic; 
                        line-height: 1.2; 
                        display: block;
                    `;
                    translationDiv.innerText = "➤ " + response.translated;
                    const parent = textElement.parentNode;
                    if (parent) {
                        parent.insertBefore(translationDiv, textElement.nextSibling);
                    }
                }
            } catch {
                // Ничего не делаем: контекст мог быть инвалидирован.
            }
        }
    );
}

const scanChat = () => {
    document.querySelectorAll(CHAT_TEXT_SELECTORS.join(',')).forEach(processText);
};

const findTextNodes = (root) => {
    if (!root || !root.querySelectorAll) return [];
    return Array.from(root.querySelectorAll(CHAT_TEXT_SELECTORS.join(',')));
};

const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
            if (!node || node.nodeType !== 1) return;

            // На некоторых страницах/в VOD структура отличается:
            // поэтому переводим именно по текстовому узлу.
            if (node.matches && CHAT_TEXT_SELECTORS.some((sel) => node.matches(sel))) {
                processText(node);
                return;
            }

            findTextNodes(node).forEach(processText);
        });
    });
});

let initialized = false;
function init() {
    if (initialized) return;
    initialized = true;

    // В live и в VOD контейнеры могут отличаться.
    // Если не нашли подходящий контейнер — наблюдаем за всем документом.
    const chatContainer =
        document.querySelector('.chat-scrollable-area__bundle-wm') ||
        document.querySelector('div[role="log"]') ||
        document.body;

    if (!chatContainer) {
        initialized = false;
        setTimeout(init, 2000);
        return;
    }

    observer.observe(chatContainer, { childList: true, subtree: true });

    // На VOD часто сообщения уже присутствуют при загрузке.
    scanChat();
    setInterval(scanChat, 2000);
}

init();