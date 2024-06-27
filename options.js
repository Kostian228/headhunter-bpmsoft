document.addEventListener("DOMContentLoaded", restoreOptions);

const saveButton = document.getElementById("save-options-buton");
saveButton.addEventListener("click", saveOptions);

function saveOptions() {
    const crmAddress = document.getElementById("crm-address").value;
    chrome.storage.sync.set(
        {
            crmAddress,
        },
        () => alert("Настройки сохранены!")
    );
}

function restoreOptions() {
    chrome.storage.sync.get(["crmAddress"], function (items) {
        if (items.crmAddress) {
            document.getElementById("crm-address").value = items.crmAddress;
        }
    });
}
