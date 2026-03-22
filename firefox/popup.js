const api = typeof browser !== "undefined" ? browser : chrome;

const langSelect = document.getElementById('langSelect');
const colorPicker = document.getElementById('colorPicker');
const toggle = document.getElementById('enableTranslation');
const statusText = document.getElementById('statusText');

// Загрузка настроек
api.storage.sync.get(['targetLang', 'translationColor', 'translationEnabled'], (data) => {
    if (data.targetLang) langSelect.value = data.targetLang;
    if (data.translationColor) colorPicker.value = data.translationColor;
    
    const enabled = data.translationEnabled !== false; // default true
    toggle.checked = enabled;
    updateStatus(enabled);
});

function updateStatus(enabled) {
    statusText.textContent = enabled ? 'Включён' : 'Выключен';
    statusText.className = 'toggle-label' + (enabled ? ' enabled' : '');
}

// Сохранение
langSelect.addEventListener('change', () => {
    api.storage.sync.set({ targetLang: langSelect.value });
});

colorPicker.addEventListener('input', () => {
    api.storage.sync.set({ translationColor: colorPicker.value });
});

toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    api.storage.sync.set({ translationEnabled: enabled });
    updateStatus(enabled);
});