var pollIntervalMinutesMin = 1;
var pollIntervalMinutesMax = 60;
var requestTimeoutSeconds = 1000 * 2;
var repositoriesData = [];

var LOADING = 'LOADING';
var LOADED = 'LOADED';
var ERROR = 'ERROR';
var RENDERED = 'RENDERED';

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

function getHTML() {
    return repositoriesData.toString();
}

function loadData() {
    console.log('LOAD DATA CALL');
    chrome.storage.sync.get({
        authToken: '',
        organization: ''
    }, function (items) {
        var authToken = items.authToken;
        var organization = items.organization;

        if (authToken && organization) {
            getRepositories(authToken, organization);
        } else {
            console.log("No oauth token or organization");
            delete localStorage.notificationCount;
            updateIcon();
        }
    });
}

function getRepositories(authToken, organization) {
    var xhr = new XMLHttpRequest();

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);
        localStorage.requestFailureCount++;

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status < 200 || this.status >= 300) {
                console.error('Get Repositories Failed: ' + this.status);
                return;
            }

            if (xhr.responseText) {
                var repositoryArray = JSON.parse(xhr.responseText);
                // console.log(repositoryArray);

                repositoriesData = [];
                for (var i = 0, repository; repository = repositoryArray[i]; i++) {
                    var repoData = {
                        name: repository.name,
                        full_name: repository.full_name,
                        url: repository.html_url,
                        updated_at: repository.updated_at,
                        pull_requests: [],
                        status: LOADING
                    };
                    repositoriesData.push(repoData);

                    updateIcon();

                    getRepositoryPullRequests(authToken, repoData);
                }

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open("GET", "https://api.github.com/orgs/" + organization + "/repos", true);
        xhr.setRequestHeader("Authorization", "token " + authToken);
        xhr.send(null);
    } catch (e) {
        console.error("Get Repositories XHR exception");
        handleError();
    }
}

function getRepositoryPullRequests(authToken, repoData) {
    var xhr = new XMLHttpRequest();
    var repositoryFullName = repoData.full_name;

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);
        localStorage.requestFailureCount++;

        repoData.status = ERROR;

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status < 200 || this.status >= 300) {
                console.error('Get Repositories Failed: ' + this.status);
                repoData.status = ERROR;
                return;
            }

            if (xhr.responseText) {
                var pullRequestArray = JSON.parse(xhr.responseText);
                // if (pullRequestArray.length > 0) {
                //     console.log(repositoryFullName + ':');
                //     console.log(pullRequestArray);
                // }

                for (var i = 0, pullRequest; pullRequest = pullRequestArray[i]; i++) {
                    var assigneesArray = [];
                    for (var j = 0, assignee; assignee = pullRequest.assignees[j]; j++) {
                        var assigneeData = {
                            id: assignee.id,
                            username: assignee.login,
                            avatar_url: assignee.avatar_url,
                            url: assignee.html_url
                        };
                        assigneesArray.push(assigneeData);
                    }

                    var pendingReviewers = [];
                    for (var k = 0, reviewer; reviewer = pullRequest.requested_reviewers[k]; k++) {
                        var pendingReviewerData = {
                            id: reviewer.id,
                            username: reviewer.login,
                            avatar_url: reviewer.avatar_url,
                            url: reviewer.html_url
                        };
                        pendingReviewers.push(pendingReviewerData);
                    }


                    var pullRequestData = {
                        id: pullRequest.id,
                        number: pullRequest.number,
                        title: pullRequest.title,
                        url: pullRequest.html_url,
                        assignees: assigneesArray,
                        head_name: pullRequest.head.ref,
                        base_name: pullRequest.base.ref,
                        labels: [],
                        pending_reviewers: pendingReviewers,
                        disapproved_reviewers: [],
                        approved_reviewers: [],
                        comment_reviewers: [],
                        unanswered_comments: -1,
                        comments: -1,
                        commits: -1,
                        additions: -1,
                        deletions: -1,
                        changed_files: -1,
                        mergeable: null,
                        created_at: pullRequest.created_at,
                        updated_at: pullRequest.updated_at,
                        status: LOADING
                    };

                    repoData.pull_requests.push(pullRequestData);

                    updateIcon();

                    getPullRequest(authToken, repositoryFullName, pullRequestData);

                    // TODO: Count how many comments are left unanswered by the assignee
                }
                repoData.status = LOADED;

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open("GET", "https://api.github.com/repos/" + repositoryFullName + "/pulls?state=open&sort=created&direction=asc", true);
        xhr.setRequestHeader("Authorization", "token " + authToken);
        xhr.send(null);
    } catch (e) {
        console.error("Get Repositories XHR exception");
        handleError();
    }
}

function getPullRequest(authToken, repositoryFullName, pullRequestData) {
    var xhr = new XMLHttpRequest();
    var pullRequestNumber = pullRequestData.number;

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);
        localStorage.requestFailureCount++;

        pullRequestData.status = ERROR;

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status < 200 || this.status >= 300) {
                console.error('Get Repositories Failed: ' + this.status);
                pullRequestData.status = ERROR;
                return;
            }

            if (xhr.responseText) {
                var pullRequestInfo = JSON.parse(xhr.responseText);
                // console.log(repositoryFullName + '/' + pullRequestNumber + ':');
                // console.log(pullRequestInfo);

                pullRequestData.comments = pullRequestInfo.comments;
                pullRequestData.commits = pullRequestInfo.commits;
                pullRequestData.additions = pullRequestInfo.additions;
                pullRequestData.deletions = pullRequestInfo.deletions;
                pullRequestData.changed_files = pullRequestInfo.changed_files;
                pullRequestData.mergeable = pullRequestInfo.mergeable;

                updateIcon();

                getPullRequestReviews(authToken, repositoryFullName, pullRequestData)

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open("GET", "https://api.github.com/repos/" + repositoryFullName + "/pulls/" + pullRequestNumber, true);
        xhr.setRequestHeader("Authorization", "token " + authToken);
        xhr.send(null);
    } catch (e) {
        console.error("Get Repositories XHR exception");
        handleError();
    }
}

function getPullRequestReviews(authToken, repositoryFullName, pullRequestData) {
    var xhr = new XMLHttpRequest();
    var pullRequestNumber = pullRequestData.number;

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);
        localStorage.requestFailureCount++;

        pullRequestData.status = ERROR;

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status < 200 || this.status >= 300) {
                console.error('Get Repositories Failed: ' + this.status);
                pullRequestData.status = ERROR;
                return;
            }

            if (xhr.responseText) {
                var reviewersData = JSON.parse(xhr.responseText);
                // console.log(repositoryFullName + '/' + pullRequestNumber + '/reviewers:');
                // console.log(reviewersData);

                var latestUniqueReviewers = {};
                for (var j = 0, reviewer; reviewer = reviewersData[j]; j++) {
                    var userId = reviewer.user.id;

                    latestUniqueReviewers[userId] = {
                        id: reviewer.id,
                        status: reviewer.state,
                        userId: userId,
                        username: reviewer.user.login,
                        avatar_url: reviewer.user.avatar_url,
                        url: reviewer.user.html_url
                    };
                }

                var approvedReviewers = [];
                var disapprovedReviewers = [];
                var commentReviewers = [];
                Object.keys(latestUniqueReviewers).forEach(function (key) {
                    var reviewerData = latestUniqueReviewers[key];

                    if (reviewerData.status === 'APPROVED') {
                        approvedReviewers.push(reviewerData);
                    } else {
                        if (reviewerData.status === 'CHANGES_REQUESTED') {
                            disapprovedReviewers.push(reviewerData);
                        } else {
                            if (reviewerData.status === 'COMMENTED') {
                                commentReviewers.push(reviewerData);
                            } else {
                                console.error('Unknown Reviewer status: ' + reviewerData.status)
                            }
                        }
                    }
                });

                pullRequestData.approved_reviewers = approvedReviewers;
                pullRequestData.disapproved_reviewers = disapprovedReviewers;
                pullRequestData.comment_reviewers = commentReviewers;

                updateIcon();

                getPullRequestLabels(authToken, repositoryFullName, pullRequestData)

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open("GET", "https://api.github.com/repos/" + repositoryFullName + "/pulls/" + pullRequestNumber + "/reviews", true);
        xhr.setRequestHeader("Authorization", "token " + authToken);
        xhr.send(null);
    } catch (e) {
        console.error("Get Repositories XHR exception");
        handleError();
    }
}

function getPullRequestLabels(authToken, repositoryFullName, pullRequestData) {
    var xhr = new XMLHttpRequest();
    var pullRequestNumber = pullRequestData.number;

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);
        localStorage.requestFailureCount++;

        pullRequestData.status = ERROR;

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status < 200 || this.status >= 300) {
                console.error('Get Repositories Failed: ' + this.status);
                pullRequestData.status = ERROR;
                return;
            }

            if (xhr.responseText) {
                var labelsData = JSON.parse(xhr.responseText);
                // console.log(repositoryFullName + '/' + pullRequestNumber + '/labels:');
                // console.log(labelsData);

                var labels = [];
                for (var j = 0, label; label = labelsData.labels[j]; j++) {
                    var labelData = {
                        id: label.id,
                        name: label.name,
                        color: label.color
                    };

                    labels.push(labelData);
                }

                pullRequestData.labels = labels;
                pullRequestData.status = LOADED;

                updateIcon();

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open("GET", "https://api.github.com/repos/" + repositoryFullName + "/issues/" + pullRequestNumber, true);
        xhr.setRequestHeader("Authorization", "token " + authToken);
        xhr.send(null);
    } catch (e) {
        console.error("Get Repositories XHR exception");
        handleError();
    }
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