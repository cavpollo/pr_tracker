// Saves options to chrome.storage
function save_options() {
    var authToken = document.getElementById('authToken').value;
    var organization = document.getElementById('organization').value;

    chrome.storage.sync.set({
        authToken: authToken,
        organization: organization
    }, function() {
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        var backgroundPage = chrome.extension.getBackgroundPage();
        backgroundPage.loadData();
        setTimeout(function() {
            status.textContent = '';
        }, 1500);
    });
}


function restore_options() {
    chrome.storage.sync.get({
        authToken: '',
        organization: ''
    }, function(items) {
        document.getElementById('authToken').value = items.authToken;
        document.getElementById('organization').value = items.organization;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);