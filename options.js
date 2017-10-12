// Saves options to chrome.storage
function save_options() {
    var username = document.getElementById('username').value;
    var keyThing = document.getElementById('keyThing').value;
    chrome.storage.sync.set({
        username: username,
        keyThing: keyThing
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 1500);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value username = '' and keyThing = ''.
    chrome.storage.sync.get({
        username: '',
        keyThing: ''
    }, function(items) {
        document.getElementById('username').value = items.username;
        document.getElementById('keyThing').value = items.keyThing;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);