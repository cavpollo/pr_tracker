var requestTimeoutSeconds = 1000 * 2;
var refreshPeriodMinutes = 5;
var watchdogPeriodMinutes = 10;
var maxRequestsPerSecond = 25;
var repositoriesData = [];
var apiTimeoutSeconds = 1;
var apiTimeoutRandomSeconds = 10;
var startApiTime = 0;
var apiCount = 0;
var currentRandomId = -1;

var LOADING = 'LOADING';
var LOADED = 'LOADED';
var ERROR = 'ERROR';
var RENDERED = 'RENDERED';

function goToIndexPage() {
    var indexUrl = chrome.runtime.getURL('index.html');

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

function asyncGetWithTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params) {
    apiCount = apiCount + 1;
    // console.log('START ' + methodName);

    var now = new Date();

    var timeInSeconds = (now.getTime() - startApiTime.getTime()) / 1000;
    var requestsPerSecond = timeInSeconds < 0.5 ? 0 : apiCount / timeInSeconds;
    // console.log(methodName + ' Requests Per Second: ' + apiCount + 'req / ' + timeInSeconds + 's = ' + requestsPerSecond + 'req/s');

    if (requestsPerSecond > maxRequestsPerSecond) {
        apiCount = apiCount - 1;
        doTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params);
    } else {
        asyncGet(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params);
    }
}

function doTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params) {
    var timeout = (apiTimeoutSeconds * 1000) + (apiTimeoutRandomSeconds * 1000 * Math.random());
    // console.log(methodName + ': Retry in ' + timeout);
    setTimeout(function () {
        console.log(methodName + ': Retrying');
        asyncGetWithTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params);
    }, timeout);
}

function asyncGet(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params) {
    var xhr = new XMLHttpRequest();

    if (url === undefined) {
        console.error('No url');
        return;
    }

    var buildUrl = url;
    if (page) {
        buildUrl = buildUrl + (buildUrl.includes('?') ? '&' : '?') + 'per_page=50&page=' + page
    }
    // console.log(buildUrl);

    var abortTimerId = window.setTimeout(function () {
        xhr.abort();
    }, requestTimeoutSeconds);

    function handleError() {
        window.clearTimeout(abortTimerId);

        delete localStorage.notificationCount;
        updateIcon();
    }

    try {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                if (xhr.readyState === 3) {
                    var link = xhr.getResponseHeader('link');
                    if (link) {
                        // console.log(link);
                        var nextPagePresent = link.includes('rel="next"');

                        if (nextPagePresent) {
                            asyncGetWithTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page + 1, callback, params);
                        }
                    }
                }

                return;
            }

            if (this.status === 0) {
                console.error(methodName + ' API Call Limit Exceeded (or no connection) - will retry');
                asyncGetWithTimeout(methodName, cumulativeRepositoryData, randomId, authToken, url, page, callback, params);
                return;
            }

            if (this.status !== 304 && (this.status < 200 || this.status >= 300)) {
                console.error(methodName + ' Failed: ' + this.status + ' - ' + url);
                return;
            }

            if(randomId !== currentRandomId){
                console.error(methodName + ' Request is too old');
                return;
            }

            if (xhr.responseText) {
                var response = JSON.parse(xhr.responseText);

                // console.log(methodName + ': ');
                // console.log(response);

                if (callback) {
                    callback(cumulativeRepositoryData, randomId, authToken, params, response);
                }

                return;
            }

            handleError();
        };
        xhr.onerror = function (error) {
            handleError();
        };
        xhr.open('GET', buildUrl, true);
        xhr.setRequestHeader('Authorization', 'token ' + authToken);
        xhr.send(null);
    } catch (e) {
        console.error(methodName + ' exception  - ' + url);
        handleError();
    }
}

function loadData() {
    console.log('LOAD DATA CALL');
    chrome.storage.sync.get({
        authToken: '',
        organization: '',
        reposIgnored: ''
    }, function (items) {
        var authToken = items.authToken;
        var organization = items.organization;
        var reposIgnored = items.reposIgnored.split(',').map(function (s) {
            return s.trim()
        });

        if (authToken && organization) {
            var randomId = Math.random();
            currentRandomId = randomId + 0;

            repositoriesData = [];
            startApiTime = new Date();
            apiCount = 0;

            chrome.alarms.clear('refresh', function (wasCleared) {
                chrome.alarms.create('refresh', {periodInMinutes: refreshPeriodMinutes});
            });

            asyncGetWithTimeout('Repositories',
                repositoriesData,
                randomId,
                authToken,
                'https://api.github.com/orgs/' + organization + '/repos',
                1,
                getRepositories,
                {reposIgnored: reposIgnored})
        } else {
            console.log('No oauth token or organization');
            delete localStorage.notificationCount;
            updateIcon();
        }
    });
}

function getRepositories(cumulativeRepositoryData, randomId, authToken, params, response) {
    // console.log(response);

    for (var i = 0, repository; repository = response[i]; i++) {
        if (params.reposIgnored.indexOf(repository.name) > -1) {
            console.log('Repo ' + repository.name + ' was ignored.');
            continue;
        }

        var fullName = repository.full_name;

        var repoData = {
            name: repository.name,
            full_name: fullName,
            url: repository.html_url,
            updated_at: repository.updated_at,
            pull_requests: [],
            status: LOADING
        };
        cumulativeRepositoryData.push(repoData);

        updateIcon();

        asyncGetWithTimeout('Pull Requests ' + fullName,
            cumulativeRepositoryData,
            randomId,
            authToken,
            'https://api.github.com/repos/' + fullName + '/pulls?state=open&sort=created&direction=asc',
            1,
            getRepositoryPullRequests,
            {repoData: repoData});
    }
}

function getRepositoryPullRequests(cumulativeRepositoryData, randomId, authToken, params, response) {
    var repoData = params.repoData;
    var repositoryFullName = params.repoData.full_name;

    if (response.length > 0) {
        // console.log(repositoryFullName + ':');
        // console.log(pullRequestArray);
    }

    for (var i = 0, pullRequest; pullRequest = response[i]; i++) {
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

        var pullRequestNumber = pullRequest.number;

        var pullRequestData = {
            id: pullRequest.id,
            number: pullRequestNumber,
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
            dismissed_reviewers: [],
            unanswered_comments: -1,
            comments: -1,
            commits: -1,
            additions: -1,
            deletions: -1,
            changed_files: -1,
            mergeable: null,
            created_by: pullRequest.user.login,
            created_at: pullRequest.created_at,
            updated_at: pullRequest.updated_at,
            status: LOADING
        };

        repoData.pull_requests.push(pullRequestData);

        updateIcon();

        asyncGetWithTimeout('Pull Request ' + repositoryFullName,
            cumulativeRepositoryData,
            randomId,
            authToken,
            'https://api.github.com/repos/' + repositoryFullName + '/pulls/' + pullRequestNumber,
            null,
            getPullRequest,
            {
                pullRequestData: pullRequestData,
                repositoryFullName: repositoryFullName,
                pullRequestNumber: pullRequestNumber
            });

        // TODO: Count how many comments are left unanswered by the assignee
    }
    params.repoData.status = LOADED;

    return;
}

function getPullRequest(cumulativeRepositoryData, randomId, authToken, params, response) {
    var repositoryFullName = params.repositoryFullName;
    var pullRequestData = params.pullRequestData;
    var pullRequestNumber = params.pullRequestNumber;

    // console.log(repositoryFullName + '/' + pullRequestNumber + ':');
    // console.log(response);

    pullRequestData.comments = response.comments;
    pullRequestData.commits = response.commits;
    pullRequestData.additions = response.additions;
    pullRequestData.deletions = response.deletions;
    pullRequestData.changed_files = response.changed_files;
    pullRequestData.mergeable = response.mergeable;

    updateIcon();

    asyncGetWithTimeout('Reviews ' + repositoryFullName,
        cumulativeRepositoryData,
        randomId,
        authToken,
        'https://api.github.com/repos/' + repositoryFullName + '/pulls/' + pullRequestNumber + '/reviews',
        1,
        getPullRequestReviews,
        {
            repositoryFullName: repositoryFullName,
            pullRequestNumber: pullRequestNumber,
            pullRequestData: pullRequestData
        });
}

function getPullRequestReviews(cumulativeRepositoryData, randomId, authToken, params, response) {
    var repositoryFullName = params.repositoryFullName;
    var pullRequestNumber = params.pullRequestNumber;
    var pullRequestData = params.pullRequestData;

    console.log(repositoryFullName + '/' + pullRequestNumber + '/reviewers:');
    console.log(response);

    var latestUniqueReviewers = {};
    for (var j = 0, reviewer; reviewer = response[j]; j++) {
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
    var dismissedReviewers = [];
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
                    if (reviewerData.status === 'DISMISSED') {
                        dismissedReviewers.push(reviewerData);
                    } else {
                        console.error('Unknown Reviewer status: ' + reviewerData.status)
                    }
                }
            }
        }
    });

    pullRequestData.approved_reviewers = approvedReviewers;
    pullRequestData.disapproved_reviewers = disapprovedReviewers;
    pullRequestData.comment_reviewers = commentReviewers;
    pullRequestData.dismissed_reviewers = dismissedReviewers;

    updateIcon();

    asyncGetWithTimeout('Labels ' + repositoryFullName,
        cumulativeRepositoryData,
        randomId,
        authToken,
        'https://api.github.com/repos/' + repositoryFullName + '/issues/' + pullRequestNumber,
        null,
        getPullRequestLabels,
        {
            repositoryFullName: repositoryFullName,
            pullRequestNumber: pullRequestNumber,
            pullRequestData: pullRequestData
        });
}

function getPullRequestLabels(cumulativeRepositoryData, randomId, authToken, params, response) {
    var repositoryFullName = params.repositoryFullName;
    var pullRequestNumber = params.pullRequestNumber;
    var pullRequestData = params.pullRequestData;

    // console.log(repositoryFullName + '/' + pullRequestNumber + '/labels:');
    // console.log(labelsData);

    var labels = [];
    for (var j = 0, label; label = response.labels[j]; j++) {
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

function createAlarm() {
    chrome.alarms.get('refresh', function (alarm) {
        if (alarm) {
            // Nothing
        } else {
            chrome.alarms.create('refresh', {periodInMinutes: refreshPeriodMinutes});
        }
    });
}

chrome.browserAction.onClicked.addListener(goToIndexPage);
chrome.alarms.onAlarm.addListener(onAlarm);

loadData();
chrome.alarms.create('watchdog', {periodInMinutes: watchdogPeriodMinutes});