chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "translate") {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${message.tl}&dt=t&q=${encodeURIComponent(message.text)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                const result = data[0].map(x => x[0]).join("");
                sendResponse({ translated: result });
            })
            .catch(err => {
                console.error("TCT Error:", err);
                sendResponse({ error: true });
            });
        
        return true; // КРИТИЧНО для Firefox
    }
});