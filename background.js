var pollIntervalMinutesMin = 1;
var pollIntervalMinutesMax = 60;

function goToIndexPage() {
    var indexUrl = chrome.runtime.getURL("index.html");

    chrome.tabs.getAllInWindow(undefined, function (openTabs) {
        for (var i = 0, openTab; openTab = openTabs[i]; i++) {
            if (openTab.url && openTab.url === indexUrl) {
                chrome.tabs.update(openTab.id, {selected: true});

                loadData();

                return;
            }
        }

        chrome.tabs.create({url: indexUrl});
    });
}

function updateIcon() {
    if (localStorage.hasOwnProperty('notificationCount')) {
        chrome.browserAction.setIcon({path: 'images/logged_in.png'});
        chrome.browserAction.setBadgeBackgroundColor({color: [208, 0, 24, 255]});
        chrome.browserAction.setBadgeText({
            text: localStorage.notificationCount === '0' ? '' : localStorage.notificationCount
        });
    } else {
        chrome.browserAction.setIcon({path: 'images/not_logged_in.png'});
        chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
        chrome.browserAction.setBadgeText({text: 'X'});
    }
}

function loadData() {
    console.log('LOAD DATA CALL');
    chrome.storage.sync.get({
        authToken: '',
        organization: ''
    }, function (items) {
        items.authToken;
        items.organization;

        if (items.authToken && items.organization) {

        } else {
            console.log("No oauth token or organization");
            delete localStorage.notificationCount;
        }

        updateIcon();
    });
}

function onAlarm(alarm) {
    console.log('Got alarm: ', alarm);
    if (alarm) {
        var alarm_name = alarm.name;
        if (alarm_name === 'watchdog') {
            createAlarm();
        } else {
            if (alarm_name === 'refresh') {
                loadData();
            } else {
                console.error('Unknown alarm: ' + alarm_name);
            }
        }
    }
}

function getPollDelay() {
    var randomness = Math.random() * 2;
    var exponent = Math.pow(2, localStorage.requestFailureCount || 0);
    var multiplier = Math.max(randomness * exponent, 1);
    var delay = Math.min(multiplier * pollIntervalMinutesMin, pollIntervalMinutesMax);
    return Math.round(delay);
}

function createAlarm() {
    chrome.alarms.get('refresh', function (alarm) {
        if (alarm) {
            // Nothing
        } else {
            chrome.alarms.create('refresh', {periodInMinutes: getPollDelay()});
        }
    });
}

chrome.browserAction.onClicked.addListener(goToIndexPage);
chrome.alarms.onAlarm.addListener(onAlarm);

updateIcon();
chrome.alarms.create('watchdog', {periodInMinutes: 5});