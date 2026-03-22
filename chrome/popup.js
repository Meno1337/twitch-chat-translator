const langSelect     = document.getElementById('langSelect');
const colorPicker    = document.getElementById('colorPicker');
const toggle         = document.getElementById('enableTranslation');
const statusText     = document.getElementById('statusText');

// Загрузка сохранённых настроек
chrome.storage.sync.get(['targetLang', 'translationColor', 'translationEnabled'], (data) => {
    if (data.targetLang)       langSelect.value = data.targetLang;
    if (data.translationColor) colorPicker.value = data.translationColor;
    
    const enabled = data.translationEnabled !== false; // default = true
    toggle.checked = enabled;
    updateStatusText(enabled);
});

function updateStatusText(enabled) {
    statusText.textContent = enabled ? "Включён" : "Выключен";
    statusText.className = "cf-toggle-label" + (enabled ? " enabled" : "");
}

// Сохранение языка
langSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ targetLang: langSelect.value });
});

// Сохранение цвета
colorPicker.addEventListener('input', () => {
    chrome.storage.sync.set({ translationColor: colorPicker.value });
});

// Тумблер
toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ translationEnabled: enabled });
    updateStatusText(enabled);
});