chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "translate") {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${request.tl}&dt=t&q=${encodeURIComponent(request.text)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const translatedText = data[0].map(item => item[0]).join('');
                sendResponse({ translated: translatedText });
            })
            .catch(error => {
                console.error("Translation Error:", error);
                sendResponse({ error: true });
            });
        return true; // Важно для асинхронного sendResponse
    }
});