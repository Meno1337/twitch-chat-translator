chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "translate") {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${message.tl}&dt=t&q=${encodeURIComponent(message.text)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const result = data[0].map(x => x[0]).join("");
                const normalizeForCompare = (s) =>
                    (s ?? "")
                        .replace(/\u00A0/g, " ") // NBSP -> space
                        .replace(/\s+/g, " ")  // collapse whitespace
                        .trim()
                        .toLowerCase();

                const originalNorm = normalizeForCompare(message.text);
                const resultNorm = normalizeForCompare(result);

                // Если Google фактически вернул исходный текст (тот же язык),
                // пропускаем вставку, чтобы не было "перевода ради перевода".
                if (originalNorm && originalNorm === resultNorm) {
                    sendResponse({ translated: null });
                } else {
                    sendResponse({ translated: result });
                }
            })
            .catch(err => {
                console.error("TCT Error:", err);
                sendResponse({ error: true });
            });
        
        return true; // КРИТИЧНО для Firefox
    }
});