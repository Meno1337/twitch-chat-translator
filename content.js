let targetLang = "ru";
let translationColor = "#00e6cb";

const updateSettings = () => {
    chrome.storage.sync.get(['targetLang', 'translationColor'], (result) => {
        if (result.targetLang) targetLang = result.targetLang;
        if (result.translationColor) translationColor = result.translationColor;
    });
};
updateSettings();
setInterval(updateSettings, 3000); // Обновляем настройки раз в 3 сек

async function processMessage(messageNode) {
    if (!messageNode || messageNode.dataset.translated === "true") return;

    const textElement = messageNode.querySelector('.chat-line__message-body') || 
                        messageNode.querySelector('[data-a-target="chat-message-text"]');

    if (!textElement) return;

    const originalText = textElement.innerText.trim();
    if (originalText.length < 2 || /^\d+$/.test(originalText)) return;

    messageNode.dataset.translated = "true";

    chrome.runtime.sendMessage({
        type: "translate",
        text: originalText,
        tl: targetLang 
    }, (response) => {
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
            translationDiv.innerText = "— " + response.translated;
            textElement.parentNode.insertBefore(translationDiv, textElement.nextSibling);
        }
    });
}

// Остальная часть кода (Observer и Init) остается такой же, как в предыдущем стабильном варианте
const scanChat = () => {
    document.querySelectorAll('.chat-line__message, [data-a-target="chat-line-message"]').forEach(processMessage);
};

const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
            if (node.classList?.contains('chat-line__message') || node.getAttribute?.('data-a-target') === 'chat-line-message') {
                processMessage(node);
            }
        }
    }));
});

function init() {
    const chatContainer = document.querySelector('.chat-scrollable-area__bundle-wm') || document.querySelector('div[role="log"]');
    if (chatContainer) {
        observer.observe(chatContainer, { childList: true, subtree: true });
        setInterval(scanChat, 2000);
    } else {
        setTimeout(init, 2000);
    }
}
init();