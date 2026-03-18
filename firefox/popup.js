const select = document.getElementById('langSelect');
const colorPicker = document.getElementById('colorPicker');

// Загружаем сохраненные настройки
chrome.storage.sync.get(['targetLang', 'translationColor'], (result) => {
    if (result.targetLang) select.value = result.targetLang;
    if (result.translationColor) colorPicker.value = result.translationColor;
});

// Сохраняем язык
select.addEventListener('change', () => {
    chrome.storage.sync.set({ targetLang: select.value });
});

// Сохраняем цвет
colorPicker.addEventListener('input', () => {
    chrome.storage.sync.set({ translationColor: colorPicker.value });
}); 